import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { entries } from '../db/schema.js';
import { excerptFrom } from '../lib/utils.js';
import { extractArticle } from './extractor.js';

export async function refetchEntryMetadata(entryId: string) {
  const [entry] = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
  if (!entry) return { ok: false as const, error: 'Not found' };
  if (!entry.sourceUrl) return { ok: false as const, error: 'No URL on this entry' };

  const extracted = await extractArticle(entry.sourceUrl);

  if (!extracted.ok) {
    const [updated] = await db
      .update(entries)
      .set({
        title: extracted.title ?? entry.title,
        type: entry.type === 'note' ? entry.type : 'reference',
      })
      .where(eq(entries.id, entryId))
      .returning();
    return {
      ok: false as const,
      error: extracted.reason ?? 'Could not fetch article',
      entry: updated,
    };
  }

  const [updated] = await db
    .update(entries)
    .set({
      type: 'article',
      title: extracted.title ?? entry.title,
      excerpt: extracted.excerpt ?? entry.excerpt,
      fullTextMd: extracted.bodyMd ?? entry.fullTextMd,
      heroImage: extracted.heroUrl ?? entry.heroImage,
      author: extracted.author ?? entry.author,
      publishedAt: extracted.publishedAt ? new Date(extracted.publishedAt) : entry.publishedAt,
    })
    .where(eq(entries.id, entryId))
    .returning();

  if (!updated.excerpt && updated.fullTextMd) {
    const excerpt = excerptFrom(updated.fullTextMd);
    await db.update(entries).set({ excerpt }).where(eq(entries.id, entryId));
  }

  return { ok: true as const, entry: updated };
}

export async function refetchResearchMetadata(
  researchId: string,
  options: { missingOnly?: boolean; limit?: number } = {}
) {
  const { missingOnly = true, limit = 15 } = options;
  const rows = await db.select().from(entries).where(eq(entries.researchId, researchId));

  const candidates = rows.filter((e) => {
    if (!e.sourceUrl) return false;
    if (!missingOnly) return true;
    return !e.heroImage || !e.fullTextMd || e.title === e.sourceUrl;
  });

  const batch = candidates.slice(0, limit);
  let refetched = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of batch) {
    const result = await refetchEntryMetadata(entry.id);
    if (result.ok) refetched++;
    else {
      failed++;
      if (errors.length < 5 && result.error) errors.push(result.error);
    }
  }

  return {
    refetched,
    failed,
    remaining: Math.max(0, candidates.length - batch.length),
    total: candidates.length,
    errors,
  };
}
