import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

turndown.remove(['video', 'iframe', 'script', 'style']);
turndown.addRule('videoFallback', {
  filter: (node) => {
    if (node.nodeName !== 'P') return false;
    return /doesn't support embedded videos/i.test(node.textContent ?? '');
  },
  replacement: () => '',
});

export function cleanBodyMd(md: string): string {
  return md
    .replace(/Sorry, your browser doesn't support embedded videos\.?\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

function isLikelyHeroImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(svg|ico|gif)(\?|$)/i.test(lower)) return false;
  if (/favicon|logo-icon|sprite|pixel|tracking|1x1|avatar|emoji|hardware-/i.test(lower)) return false;
  if (lower.includes('data:image')) return false;
  return true;
}

function pickHero(doc: Document, url: string): string | undefined {
  const candidates: string[] = [];
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (og) candidates.push(og.startsWith('http') ? og : new URL(og, url).href);
  const twitter = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  if (twitter) candidates.push(twitter.startsWith('http') ? twitter : new URL(twitter, url).href);

  for (const c of candidates) {
    if (isLikelyHeroImage(c)) return c;
  }
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

    const bodyMd = cleanBodyMd(turndown.turndown(article.content ?? ''));
    const text = article.textContent.replace(/\s+/g, ' ').trim();
    const excerpt = text.slice(0, 280) + (text.length > 280 ? '…' : '');

    const articleAny = article as { topImage?: string };
    let heroUrl = pickHero(doc, url);
    const topImage = articleAny.topImage;
    if (!heroUrl && topImage && isLikelyHeroImage(topImage)) {
      heroUrl = topImage.startsWith('http') ? topImage : new URL(topImage, url).href;
    }

    return {
      ok: true,
      title: article.title ?? doc.querySelector('title')?.textContent ?? url,
      excerpt,
      bodyMd,
      heroUrl,
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
