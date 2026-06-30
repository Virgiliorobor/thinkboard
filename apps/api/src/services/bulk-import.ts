import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { topics, tags, entries, entryComments, entryTags, entryTopics } from '../db/schema.js';
import { slugify, excerptFrom } from '../lib/utils.js';
import { extractArticle } from './extractor.js';

const entryStatus = z.enum([
  'draft',
  'published',
  'starred',
  'implement',
  'watch_later',
  'potentially_good',
  'generic',
  'inbox',
]);

const entryType = z.enum(['article', 'article_manual', 'note', 'reference']);

export const bulkImportEntrySchema = z
  .object({
    url: z.string().url().optional(),
    title: z.string().optional(),
    comment: z.string().optional(),
    excerpt: z.string().optional(),
    fullTextMd: z.string().optional(),
    type: entryType.optional(),
    status: entryStatus.optional(),
    topics: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    fetch: z.boolean().optional(),
  })
  .refine((e) => e.url || e.title || e.comment, {
    message: 'Each entry needs at least url, title, or comment',
  });

export const bulkImportSchema = z.object({
  $schema: z.literal('thinkboard-bulk-import-v1').optional(),
  research: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      isPrivate: z.boolean().optional(),
    })
    .optional(),
  topics: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        slug: z.string().optional(),
      })
    )
    .optional(),
  entries: z.array(bulkImportEntrySchema).min(1),
  options: z
    .object({
      fetchArticles: z.boolean().optional(),
      defaultStatus: entryStatus.optional(),
      skipDuplicates: z.boolean().optional(),
    })
    .optional(),
});

export type BulkImportPayload = z.infer<typeof bulkImportSchema>;

export interface BulkImportResult {
  imported: number;
  skipped: number;
  entryIds: string[];
  topicsCreated: number;
  tagsCreated: number;
}

async function ensureTopic(researchId: string, name: string, cache: Map<string, string>) {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const slug = slugify(name);
  const [existing] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.researchId, researchId), eq(topics.slug, slug)))
    .limit(1);
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const allTopics = await db.select().from(topics).where(eq(topics.researchId, researchId));
  const sortOrder = allTopics.length;

  const [created] = await db
    .insert(topics)
    .values({ researchId, name, slug, sortOrder })
    .returning();
  cache.set(key, created.id);
  return created.id;
}

async function ensureTag(name: string, cache: Map<string, string>) {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const [existing] = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const [created] = await db.insert(tags).values({ name }).returning();
  cache.set(key, created.id);
  return created.id;
}

export async function runBulkImport(
  researchId: string,
  payload: BulkImportPayload
): Promise<BulkImportResult> {
  const parsed = bulkImportSchema.parse(payload);
  const opts = parsed.options ?? {};
  const fetchArticles = opts.fetchArticles !== false;
  const defaultStatus = opts.defaultStatus ?? 'inbox';
  const skipDuplicates = opts.skipDuplicates !== false;

  const topicCache = new Map<string, string>();
  const tagCache = new Map<string, string>();
  let topicsCreated = 0;
  let tagsCreated = 0;

  const topicNamesBefore = new Set(
    (await db.select().from(topics).where(eq(topics.researchId, researchId))).map((t) =>
      t.name.toLowerCase()
    )
  );

  for (const t of parsed.topics ?? []) {
    const before = topicNamesBefore.has(t.name.toLowerCase());
    await ensureTopic(researchId, t.name, topicCache);
    if (!before) topicsCreated++;
    topicNamesBefore.add(t.name.toLowerCase());
  }

  const tagNamesBefore = new Set((await db.select().from(tags)).map((t) => t.name.toLowerCase()));

  const existingUrls = new Set<string>();
  if (skipDuplicates) {
    const rows = await db
      .select({ sourceUrl: entries.sourceUrl })
      .from(entries)
      .where(eq(entries.researchId, researchId));
    for (const row of rows) {
      if (row.sourceUrl) existingUrls.add(row.sourceUrl);
    }
  }

  const entryIds: string[] = [];
  let skipped = 0;

  for (const item of parsed.entries) {
    if (item.url && skipDuplicates && existingUrls.has(item.url)) {
      skipped++;
      continue;
    }

    let title = item.title ?? item.url ?? 'Imported note';
    let excerpt: string | null = item.excerpt ?? null;
    let fullTextMd = item.fullTextMd ?? null;
    let heroImage: string | null = null;
    let author: string | null = null;
    let type = item.type ?? (item.url ? 'article' : 'note');
    const shouldFetch = fetchArticles && item.fetch !== false && !!item.url;

    if (shouldFetch && item.url) {
      const extracted = await extractArticle(item.url);
      if (extracted.ok) {
        title = item.title ?? extracted.title ?? title;
        excerpt = item.excerpt ?? extracted.excerpt ?? null;
        fullTextMd = item.fullTextMd ?? extracted.bodyMd ?? fullTextMd;
        heroImage = extracted.heroUrl ?? null;
        author = extracted.author ?? null;
        type = 'article';
      } else {
        title = item.title ?? extracted.title ?? item.url;
        type = item.type ?? 'reference';
      }
    } else if (item.comment && !excerpt) {
      excerpt = excerptFrom(item.comment);
    }

    const status = item.status ?? defaultStatus;

    const [entry] = await db
      .insert(entries)
      .values({
        researchId,
        type,
        title,
        sourceUrl: item.url ?? null,
        fullTextMd,
        excerpt,
        heroImage,
        author,
        status,
      })
      .returning();

    if (item.url) existingUrls.add(item.url);

    if (item.comment) {
      await db.insert(entryComments).values({
        entryId: entry.id,
        body: item.comment,
        source: 'import',
      });
    }

    for (const topicName of item.topics ?? []) {
      const topicId = await ensureTopic(researchId, topicName, topicCache);
      if (!topicNamesBefore.has(topicName.toLowerCase())) {
        topicsCreated++;
        topicNamesBefore.add(topicName.toLowerCase());
      }
      await db.insert(entryTopics).values({ entryId: entry.id, topicId }).onConflictDoNothing();
    }

    for (const tagName of item.tags ?? []) {
      const before = tagNamesBefore.has(tagName.toLowerCase());
      const tagId = await ensureTag(tagName, tagCache);
      if (!before) {
        tagsCreated++;
        tagNamesBefore.add(tagName.toLowerCase());
      }
      await db.insert(entryTags).values({ entryId: entry.id, tagId }).onConflictDoNothing();
    }

    entryIds.push(entry.id);
  }

  return {
    imported: entryIds.length,
    skipped,
    entryIds,
    topicsCreated,
    tagsCreated,
  };
}
