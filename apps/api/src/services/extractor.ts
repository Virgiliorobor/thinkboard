import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

export interface ExtractResult {
  ok: boolean;
  manualMode?: boolean;
  reason?: string;
  title?: string;
  excerpt?: string;
  bodyMd?: string;
  heroUrl?: string;
  author?: string;
  publishedAt?: string;
  sourceUrl: string;
}

function pickHero(doc: Document, url: string): string | undefined {
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (og) return og.startsWith('http') ? og : new URL(og, url).href;
  const twitter = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  if (twitter) return twitter.startsWith('http') ? twitter : new URL(twitter, url).href;
  return undefined;
}

export async function extractArticle(url: string): Promise<ExtractResult> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ResearchMagazine/1.0; +https://github.com/research-magazine)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { ok: false, manualMode: true, reason: `HTTP ${res.status}`, sourceUrl: url };
    }

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 120) {
      const title = doc.querySelector('title')?.textContent?.trim() ?? url;
      return {
        ok: false,
        manualMode: true,
        reason: 'Thin or blocked content — paste manually',
        title,
        heroUrl: pickHero(doc, url),
        sourceUrl: url,
      };
    }

    const bodyMd = turndown.turndown(article.content ?? '');
    const text = article.textContent.replace(/\s+/g, ' ').trim();
    const excerpt = text.slice(0, 280) + (text.length > 280 ? '…' : '');

    const articleAny = article as { topImage?: string };
    return {
      ok: true,
      title: article.title ?? doc.querySelector('title')?.textContent ?? url,
      excerpt,
      bodyMd,
      heroUrl: articleAny.topImage ?? pickHero(doc, url),
      author: article.byline ?? undefined,
      publishedAt: article.publishedTime ?? undefined,
      sourceUrl: url,
    };
  } catch (err) {
    return {
      ok: false,
      manualMode: true,
      reason: err instanceof Error ? err.message : 'Fetch failed',
      sourceUrl: url,
    };
  }
}
