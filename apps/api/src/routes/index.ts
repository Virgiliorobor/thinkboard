import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  researches,
  topics,
  trails,
  trailNodes,
  entries,
  entryComments,
  tags,
  entryTags,
  entryTopics,
} from '../db/schema.js';
import { slugify, excerptFrom } from '../lib/utils.js';
import { extractArticle } from '../services/extractor.js';
import { parseResearchTxt } from '../services/importer.js';
import { bulkImportSchema, runBulkImport } from '../services/bulk-import.js';
import { requireEditor, isEditor, hasResearchAccess, hasTrailAccess, setUnlockCookie } from '../lib/auth.js';
import { hashPassword, verifyPassword, unlockToken } from '../lib/password.js';

async function getResearchBySlug(slug: string) {
  const [row] = await db.select().from(researches).where(eq(researches.slug, slug)).limit(1);
  return row;
}

function checkResearchAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  research: typeof researches.$inferSelect
) {
  if (
    !hasResearchAccess(request, research.slug, research.isPrivate, research.passwordHash)
  ) {
    reply.status(403).send({
      error: 'locked',
      isPrivate: true,
      name: research.name,
      slug: research.slug,
    });
    return false;
  }
  return true;
}

async function getPrimaryComment(entryId: string) {
  const [c] = await db
    .select()
    .from(entryComments)
    .where(eq(entryComments.entryId, entryId))
    .orderBy(entryComments.createdAt)
    .limit(1);
  return c?.body ?? null;
}

function mapEntryCard(
  e: typeof entries.$inferSelect,
  userComment: string | null = null
) {
  return {
    id: e.id,
    researchId: e.researchId,
    type: e.type,
    title: e.title,
    sourceUrl: e.sourceUrl,
    excerpt: e.excerpt,
    heroImage: e.heroImage,
    author: e.author,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    userComment,
  };
}

const DEFAULT_TOPICS = [
  { name: 'Taste & the AI paradox', slug: 'taste-ai-paradox' },
  { name: 'Agency AI playbooks', slug: 'agency-ai-playbooks' },
  { name: 'AI product & UX patterns', slug: 'ai-product-ux' },
  { name: 'Brand as differentiator', slug: 'brand-differentiator' },
  { name: 'Visual inspiration', slug: 'visual-inspiration' },
  { name: 'Anti-patterns', slug: 'anti-patterns' },
];

const DEFAULT_TRAILS = [
  { name: 'Taste → AI paradox → your edge', description: 'Judgment, instinct, creativity' },
  { name: 'How agencies sell & ship AI', description: 'Adoption, trust, implementation' },
  { name: 'Making UX feel alive', description: 'Rough edges, prototypes, dynamic UI' },
  { name: 'Agency deep-dives', description: 'R/GA → Monks → Instrument → Dept' },
  { name: 'Design system as presentation', description: 'Case studies and live sites' },
];

function mapResearchPublic(r: typeof researches.$inferSelect, hasAccess: boolean) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    status: r.status,
    isPrivate: r.isPrivate,
    locked: r.isPrivate && !hasAccess,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function registerRoutes(app: FastifyInstance) {
  app.post('/api/auth/editor-login', async (request, reply) => {
    const body = z.object({ password: z.string() }).parse(request.body);
    if (body.password !== process.env.EDITOR_PASSWORD) {
      return reply.status(401).send({ error: 'Invalid password' });
    }
    const token = await reply.jwtSign({ role: 'editor' }, { expiresIn: '30d' });
    reply.setCookie('editor', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
    });
    return { ok: true, editor: true };
  });

  app.post('/api/auth/editor-logout', async (_request, reply) => {
    reply.clearCookie('editor', { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/editor', async (request) => ({
    editor: isEditor(request),
  }));

  app.post('/api/auth/research-unlock/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = z.object({ password: z.string() }).parse(request.body);
    const research = await getResearchBySlug(slug);
    if (!research?.isPrivate || !research.passwordHash) {
      return reply.status(400).send({ error: 'Research is not private' });
    }
    if (!verifyPassword(body.password, research.passwordHash)) {
      return reply.status(401).send({ error: 'Invalid password' });
    }
    setUnlockCookie(reply, `unlock_r_${slug}`, unlockToken('research', slug, research.passwordHash));
    return { ok: true };
  });

  app.post('/api/auth/trail-unlock/:trailId', async (request, reply) => {
    const { trailId } = request.params as { trailId: string };
    const body = z.object({ password: z.string() }).parse(request.body);
    const [trail] = await db.select().from(trails).where(eq(trails.id, trailId)).limit(1);
    if (!trail?.isPrivate || !trail.passwordHash) {
      return reply.status(400).send({ error: 'Trail is not private' });
    }
    if (!verifyPassword(body.password, trail.passwordHash)) {
      return reply.status(401).send({ error: 'Invalid password' });
    }
    setUnlockCookie(
      reply,
      `unlock_t_${trailId}`,
      unlockToken('trail', trailId, trail.passwordHash)
    );
    return { ok: true };
  });

  app.get('/api/researches', async (request) => {
    const rows = await db
      .select()
      .from(researches)
      .orderBy(desc(researches.createdAt));

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const [{ count: entryCount }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(entries)
          .where(and(eq(entries.researchId, r.id), sql`${entries.status} != 'inbox'`));
        const [{ count: topicCount }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(topics)
          .where(eq(topics.researchId, r.id));
        return {
          ...mapResearchPublic(r, hasResearchAccess(request, r.slug, r.isPrivate, r.passwordHash)),
          entryCount,
          topicCount,
        };
      })
    );
    return enriched;
  });

  app.post('/api/researches', { preHandler: requireEditor }, async (request) => {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        seedTopics: z.boolean().optional(),
        seedTrails: z.boolean().optional(),
        isPrivate: z.boolean().optional(),
        password: z.string().optional(),
      })
      .parse(request.body);

    const slug = slugify(body.name);
    const [research] = await db
      .insert(researches)
      .values({
        name: body.name,
        slug,
        description: body.description ?? null,
        isPrivate: body.isPrivate ?? false,
        passwordHash: body.isPrivate && body.password ? hashPassword(body.password) : null,
      })
      .returning();

    if (body.seedTopics !== false) {
      await db.insert(topics).values(
        DEFAULT_TOPICS.map((t, i) => ({
          researchId: research.id,
          name: t.name,
          slug: t.slug,
          sortOrder: i,
        }))
      );
    }

    if (body.seedTrails !== false) {
      await db.insert(trails).values(
        DEFAULT_TRAILS.map((t) => ({
          researchId: research.id,
          name: t.name,
          description: t.description,
        }))
      );
    }

    return mapResearchPublic(research, true);
  });

  app.get('/api/researches/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });

    const access = hasResearchAccess(
      request,
      slug,
      research.isPrivate,
      research.passwordHash
    );
    if (!access) {
      return reply.status(403).send({
        error: 'locked',
        isPrivate: true,
        name: research.name,
        slug: research.slug,
      });
    }

    const [{ count: entryCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(entries)
      .where(eq(entries.researchId, research.id));
    return { ...mapResearchPublic(research, true), entryCount, editor: isEditor(request) };
  });

  app.get('/api/researches/:slug/topics', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    if (!checkResearchAccess(request, reply, research)) return;
    const rows = await db
      .select()
      .from(topics)
      .where(eq(topics.researchId, research.id))
      .orderBy(topics.sortOrder);
    return rows.map((t) => ({
      id: t.id,
      researchId: t.researchId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      coverImage: t.coverImage,
      sortOrder: t.sortOrder,
    }));
  });

  app.post('/api/researches/:slug/topics', { preHandler: requireEditor }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    const body = z.object({ name: z.string(), description: z.string().optional() }).parse(request.body);
    const [topic] = await db
      .insert(topics)
      .values({
        researchId: research.id,
        name: body.name,
        slug: slugify(body.name),
        description: body.description ?? null,
      })
      .returning();
    return topic;
  });

  app.get('/api/researches/:slug/trails', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    if (!checkResearchAccess(request, reply, research)) return;

    const rows = await db.select().from(trails).where(eq(trails.researchId, research.id));
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      isPrivate: t.isPrivate,
      locked: t.isPrivate && !hasTrailAccess(request, t.id, t.isPrivate, t.passwordHash),
    }));
  });

  app.post('/api/researches/:slug/trails', { preHandler: requireEditor }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    const body = z
      .object({
        name: z.string(),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
        password: z.string().optional(),
      })
      .parse(request.body);
    const [trail] = await db
      .insert(trails)
      .values({
        researchId: research.id,
        name: body.name,
        description: body.description ?? null,
        isPrivate: body.isPrivate ?? false,
        passwordHash: body.isPrivate && body.password ? hashPassword(body.password) : null,
      })
      .returning();
    return trail;
  });

  app.get('/api/researches/:slug/trails/:trailId', async (request, reply) => {
    const { slug, trailId } = request.params as { slug: string; trailId: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    const [trail] = await db
      .select()
      .from(trails)
      .where(and(eq(trails.id, trailId), eq(trails.researchId, research.id)));
    if (!trail) return reply.status(404).send({ error: 'Trail not found' });
    if (!checkResearchAccess(request, reply, research)) return;

    if (!hasTrailAccess(request, trailId, trail.isPrivate, trail.passwordHash)) {
      return reply.status(403).send({
        error: 'locked',
        isPrivate: true,
        name: trail.name,
        trailId: trail.id,
      });
    }

    const nodes = await db
      .select()
      .from(trailNodes)
      .where(eq(trailNodes.trailId, trailId))
      .orderBy(trailNodes.position);

    const enriched = await Promise.all(
      nodes.map(async (n) => {
        const [e] = await db.select().from(entries).where(eq(entries.id, n.entryId)).limit(1);
        const comment = e ? await getPrimaryComment(e.id) : null;
        return {
          id: n.id,
          trailId: n.trailId,
          entryId: n.entryId,
          parentNodeId: n.parentNodeId,
          position: n.position,
          entry: e ? mapEntryCard(e, comment) : undefined,
        };
      })
    );

    return { ...trail, nodes: enriched };
  });

  app.get('/api/researches/:slug/entries', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });
    if (!checkResearchAccess(request, reply, research)) return;

    const query = request.query as {
      topic?: string;
      status?: string;
      trail?: string;
      inbox?: string;
    };

    let entryRows = await db
      .select()
      .from(entries)
      .where(eq(entries.researchId, research.id))
      .orderBy(desc(entries.createdAt));

    if (query.inbox === 'true') {
      if (!isEditor(request)) {
        return reply.status(401).send({ error: 'Editor login required' });
      }
      entryRows = entryRows.filter((e) => e.status === 'inbox');
    } else {
      entryRows = entryRows.filter((e) => e.status !== 'inbox');
    }

    if (query.status) {
      entryRows = entryRows.filter((e) => e.status === query.status);
    }

    if (query.topic) {
      const topicRows = await db
        .select({ entryId: entryTopics.entryId })
        .from(entryTopics)
        .innerJoin(topics, eq(entryTopics.topicId, topics.id))
        .where(and(eq(topics.researchId, research.id), eq(topics.slug, query.topic)));
      const ids = new Set(topicRows.map((r) => r.entryId));
      entryRows = entryRows.filter((e) => ids.has(e.id));
    }

    const cards = await Promise.all(
      entryRows.map(async (e) => {
        const comment = await getPrimaryComment(e.id);
        return mapEntryCard(e, comment);
      })
    );
    return cards;
  });

  app.get('/api/entries/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [e] = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
    if (!e) return reply.status(404).send({ error: 'Not found' });

    const [research] = await db
      .select()
      .from(researches)
      .where(eq(researches.id, e.researchId))
      .limit(1);

    if (!research || !checkResearchAccess(request, reply, research)) return;

    const comments = await db
      .select()
      .from(entryComments)
      .where(eq(entryComments.entryId, id))
      .orderBy(entryComments.createdAt);

    const comment = comments[0]?.body ?? null;

    return {
      ...mapEntryCard(e, comment),
      researchSlug: research?.slug ?? null,
      fullTextMd: e.fullTextMd,
      comments: comments.map((c) => ({
        id: c.id,
        entryId: c.entryId,
        body: c.body,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  });

  app.post('/api/capture/preview', { preHandler: requireEditor }, async (request) => {
    const { url } = z.object({ url: z.string().url() }).parse(request.body);
    return extractArticle(url);
  });

  app.post('/api/capture', { preHandler: requireEditor }, async (request, reply) => {
    const body = z
      .object({
        researchSlug: z.string(),
        url: z.string().url().optional(),
        title: z.string().optional(),
        comment: z.string().optional(),
        bodyMd: z.string().optional(),
        type: z.enum(['article', 'article_manual', 'note', 'reference']).optional(),
        status: z.string().optional(),
        topicSlugs: z.array(z.string()).optional(),
        trailId: z.string().optional(),
        heroUrl: z.string().optional(),
      })
      .parse(request.body);

    const research = await getResearchBySlug(body.researchSlug);
    if (!research) return reply.status(404).send({ error: 'Research not found' });

    let title = body.title ?? 'Untitled note';
    let excerpt: string | null = null;
    let fullTextMd = body.bodyMd ?? null;
    let heroImage = body.heroUrl ?? null;
    let author: string | null = null;
    let publishedAt: Date | null = null;
    let type = body.type ?? 'note';
    let sourceUrl = body.url ?? null;

    if (body.url && !body.bodyMd) {
      const extracted = await extractArticle(body.url);
      if (extracted.ok) {
        type = 'article';
        title = extracted.title ?? title;
        excerpt = extracted.excerpt ?? null;
        fullTextMd = extracted.bodyMd ?? null;
        heroImage = extracted.heroUrl ?? heroImage;
        author = extracted.author ?? null;
        publishedAt = extracted.publishedAt ? new Date(extracted.publishedAt) : null;
      } else {
        type = body.type ?? 'reference';
        title = extracted.title ?? body.url;
      }
    } else if (body.bodyMd) {
      type = body.type ?? 'article_manual';
      excerpt = excerptFrom(body.bodyMd);
    }

    if (!excerpt && fullTextMd) excerpt = excerptFrom(fullTextMd);

    const [entry] = await db
      .insert(entries)
      .values({
        researchId: research.id,
        type,
        title,
        sourceUrl,
        fullTextMd,
        excerpt,
        heroImage,
        author,
        publishedAt,
        status: body.status ?? 'published',
      })
      .returning();

    if (body.comment) {
      await db.insert(entryComments).values({
        entryId: entry.id,
        body: body.comment,
        source: 'typed',
      });
    }

    if (body.topicSlugs?.length) {
      const topicRows = await db
        .select()
        .from(topics)
        .where(eq(topics.researchId, research.id));
      for (const slug of body.topicSlugs) {
        const topic = topicRows.find((t) => t.slug === slug);
        if (topic) {
          const existing = await db
            .select()
            .from(entryTopics)
            .where(and(eq(entryTopics.entryId, entry.id), eq(entryTopics.topicId, topic.id)))
            .limit(1);
          if (!existing.length) {
            await db.insert(entryTopics).values({ entryId: entry.id, topicId: topic.id });
          }
        }
      }
    }

    if (body.trailId) {
      const [{ maxPos }] = await db
        .select({ maxPos: sql<number>`coalesce(max(${trailNodes.position}), -1)::int` })
        .from(trailNodes)
        .where(eq(trailNodes.trailId, body.trailId));
      await db.insert(trailNodes).values({
        trailId: body.trailId,
        entryId: entry.id,
        position: (maxPos ?? -1) + 1,
      });
    }

    const comment = body.comment ?? null;
    return mapEntryCard(entry, comment);
  });

  app.post('/api/researches/:slug/import', { preHandler: requireEditor }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });

    const body = z.object({ content: z.string() }).parse(request.body);
    const parsed = parseResearchTxt(body.content);
    const created: string[] = [];

    for (const item of parsed) {
      let title = item.title ?? item.sourceUrl ?? 'Imported note';
      let excerpt: string | null = null;
      let fullTextMd = item.pastedExcerpt ?? null;
      let heroImage: string | null = null;
      let type = item.type;

      if (item.sourceUrl) {
        const extracted = await extractArticle(item.sourceUrl);
        if (extracted.ok) {
          title = extracted.title ?? title;
          excerpt = extracted.excerpt ?? null;
          fullTextMd = extracted.bodyMd ?? fullTextMd;
          heroImage = extracted.heroUrl ?? null;
          type = 'article';
        } else {
          title = extracted.title ?? item.sourceUrl;
          type = 'reference';
        }
      } else if (item.userComment) {
        excerpt = excerptFrom(item.userComment);
      }

      const [entry] = await db
        .insert(entries)
        .values({
          researchId: research.id,
          type,
          title,
          sourceUrl: item.sourceUrl ?? null,
          fullTextMd,
          excerpt,
          heroImage,
          status: 'inbox',
        })
        .returning();

      if (item.userComment) {
        await db.insert(entryComments).values({
          entryId: entry.id,
          body: item.userComment,
          source: 'import',
        });
      }

      created.push(entry.id);
    }

    return { imported: created.length, entryIds: created };
  });

  app.post('/api/researches/:slug/bulk-import', { preHandler: requireEditor }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });

    const payload = bulkImportSchema.parse(request.body);

    if (payload.research?.description) {
      await db
        .update(researches)
        .set({ description: payload.research.description })
        .where(eq(researches.id, research.id));
    }

    const result = await runBulkImport(research.id, payload);
    return result;
  });

  app.post('/api/inbox/:id/publish', { preHandler: requireEditor }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [entry] = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
    if (!entry) return reply.status(404).send({ error: 'Not found' });
    const [updated] = await db
      .update(entries)
      .set({ status: 'published' })
      .where(eq(entries.id, id))
      .returning();
    const comment = await getPrimaryComment(id);
    return mapEntryCard(updated, comment);
  });

  app.get('/api/search', async (request) => {
    const { q, research } = request.query as { q?: string; research?: string };
    if (!q?.trim()) return [];

    const researchRow = research ? await getResearchBySlug(research) : null;
    if (
      researchRow &&
      !hasResearchAccess(
        request,
        researchRow.slug,
        researchRow.isPrivate,
        researchRow.passwordHash
      )
    ) {
      return [];
    }

    const pattern = `%${q}%`;

    const rows = await db
      .select({ entry: entries, researchSlug: researches.slug, researchPrivate: researches.isPrivate, researchPasswordHash: researches.passwordHash })
      .from(entries)
      .innerJoin(researches, eq(entries.researchId, researches.id))
      .where(
        and(
          researchRow ? eq(entries.researchId, researchRow.id) : sql`true`,
          sql`${entries.status} != 'inbox'`,
          or(
            ilike(entries.title, pattern),
            ilike(entries.excerpt, pattern),
            ilike(entries.fullTextMd, pattern)
          )
        )
      )
      .orderBy(desc(entries.createdAt))
      .limit(40);

    const filtered = rows.filter(({ researchSlug, researchPrivate, researchPasswordHash }) =>
      hasResearchAccess(request, researchSlug, researchPrivate, researchPasswordHash)
    );

    return Promise.all(
      filtered.map(async ({ entry: e, researchSlug }) => ({
        ...mapEntryCard(e, await getPrimaryComment(e.id)),
        researchSlug,
      }))
    );
  });

  app.get('/api/export/:slug', { preHandler: requireEditor }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const research = await getResearchBySlug(slug);
    if (!research) return reply.status(404).send({ error: 'Not found' });

    const topicRows = await db.select().from(topics).where(eq(topics.researchId, research.id));
    const trailRows = await db.select().from(trails).where(eq(trails.researchId, research.id));
    const entryRows = await db
      .select()
      .from(entries)
      .where(and(eq(entries.researchId, research.id), sql`${entries.status} != 'inbox'`));

    const trailsWithNodes = await Promise.all(
      trailRows.map(async (trail) => {
        const nodes = await db
          .select()
          .from(trailNodes)
          .where(eq(trailNodes.trailId, trail.id))
          .orderBy(trailNodes.position);
        const enriched = await Promise.all(
          nodes.map(async (n) => {
            const [e] = await db.select().from(entries).where(eq(entries.id, n.entryId)).limit(1);
            return {
              entryId: n.entryId,
              title: e?.title ?? '',
              userComment: e ? await getPrimaryComment(e.id) : null,
              url: e?.sourceUrl ?? null,
            };
          })
        );
        return { ...trail, nodes: enriched };
      })
    );

    const exportEntries = await Promise.all(
      entryRows.map(async (e) => {
        const comment = await getPrimaryComment(e.id);
        const entryTopicRows = await db
          .select({ name: topics.name })
          .from(entryTopics)
          .innerJoin(topics, eq(entryTopics.topicId, topics.id))
          .where(eq(entryTopics.entryId, e.id));
        const entryTagRows = await db
          .select({ name: tags.name })
          .from(entryTags)
          .innerJoin(tags, eq(entryTags.tagId, tags.id))
          .where(eq(entryTags.entryId, e.id));

        return {
          id: e.id,
          type: e.type,
          title: e.title,
          url: e.sourceUrl,
          excerpt: e.excerpt,
          userComment: comment,
          fullTextMd: e.fullTextMd,
          status: e.status,
          tags: entryTagRows.map((t) => t.name),
          topics: entryTopicRows.map((t) => t.name),
        };
      })
    );

    return {
      research: {
        id: research.id,
        name: research.name,
        slug: research.slug,
        description: research.description,
        status: research.status,
        createdAt: research.createdAt.toISOString(),
      },
      topics: topicRows,
      trails: trailsWithNodes,
      entries: exportEntries,
    };
  });
}
