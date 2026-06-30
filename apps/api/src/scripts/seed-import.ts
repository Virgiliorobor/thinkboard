import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { eq } from 'drizzle-orm';
import { db, closeDb } from '../db/index.js';
import { researches, topics, trails, entries, entryComments } from '../db/schema.js';
import { slugify, excerptFrom } from '../lib/utils.js';
import { parseResearchTxt } from '../services/importer.js';
import { extractArticle } from '../services/extractor.js';

const RESEARCH_NAME = 'AI Design — taste & agency playbooks';
const RESEARCH_FILE =
  process.env.SEED_FILE ??
  resolve('C:/Users/Jaime V. Rob/OneDrive/dev/research/links and research.txt');

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

async function seed() {
  const content = readFileSync(RESEARCH_FILE, 'utf-8');
  const slug = slugify(RESEARCH_NAME);

  let [research] = await db.select().from(researches).where(eq(researches.slug, slug)).limit(1);

  if (!research) {
    const [created] = await db
      .insert(researches)
      .values({
        name: RESEARCH_NAME,
        slug,
        description:
          'How to improve AI design — taste, agency playbooks, differentiation, anti-sameness.',
      })
      .returning();
    research = created;

    await db.insert(topics).values(
      DEFAULT_TOPICS.map((t, i) => ({
        researchId: research!.id,
        name: t.name,
        slug: t.slug,
        sortOrder: i,
      }))
    );
    await db.insert(trails).values(
      DEFAULT_TRAILS.map((t) => ({
        researchId: research!.id,
        name: t.name,
        description: t.description,
      }))
    );
    console.log(`Created research: ${research.name}`);
  } else {
    console.log(`Research exists: ${research.name}`);
  }

  const parsed = parseResearchTxt(content);
  let count = 0;

  for (const item of parsed) {
    let title = item.title ?? item.sourceUrl ?? 'Imported note';
    let excerpt: string | null = null;
    let fullTextMd = item.pastedExcerpt ?? null;
    let heroImage: string | null = null;
    let type = item.type;

    if (item.sourceUrl) {
      console.log(`Fetching: ${item.sourceUrl}`);
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
      await new Promise((r) => setTimeout(r, 400));
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
    count++;
  }

  console.log(`Imported ${count} entries to inbox for "${research.name}"`);
  await closeDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
