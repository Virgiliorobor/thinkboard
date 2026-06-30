import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseResearchTxt } from '../services/importer.js';

const INPUT =
  process.argv[2] ??
  resolve('C:/Users/Jaime V. Rob/OneDrive/dev/research/links and research.txt');
const OUTPUT =
  process.argv[3] ??
  resolve('../../docs/ai-design-bulk-import.json');

const SECTION_TOPICS: Record<string, string> = {
  potentially_good: 'Visual inspiration',
  generic: 'Anti-patterns',
  'customs-control-tower': 'AI product & UX patterns',
};

const AGENCY_HOSTS = [
  'rga.com',
  'monks.com',
  'monksflow.ai',
  'instrument.com',
  'deptagency.com',
  'akqa.com',
  'anml.com',
  'addition.ml',
  'designmap.com',
  'slick.global',
];

function inferTopics(item: ReturnType<typeof parseResearchTxt>[0]): string[] {
  const topics = new Set<string>();

  if (item.sectionHint && SECTION_TOPICS[item.sectionHint]) {
    topics.add(SECTION_TOPICS[item.sectionHint]);
  }

  const hay = `${item.sourceUrl ?? ''} ${item.userComment ?? ''}`.toLowerCase();

  if (
    hay.includes('taste') ||
    hay.includes('ai paradox') ||
    hay.includes('judgment') ||
    hay.includes('instinct') ||
    hay.includes('shedsgns.me/taste')
  ) {
    topics.add('Taste & the AI paradox');
  }

  if (
    AGENCY_HOSTS.some((h) => hay.includes(h)) ||
    hay.includes('agency') ||
    hay.includes('r/ga') ||
    hay.includes('monks') ||
    hay.includes('dept')
  ) {
    topics.add('Agency AI playbooks');
  }

  if (
    hay.includes('brand') ||
    hay.includes('differentiat') ||
    hay.includes('dna')
  ) {
    topics.add('Brand as differentiator');
  }

  if (
    hay.includes('ux') ||
    hay.includes('ui') ||
    hay.includes('design system') ||
    hay.includes('prototype') ||
    hay.includes('customs control') ||
    hay.includes('dashboard') ||
    hay.includes('agent')
  ) {
    topics.add('AI product & UX patterns');
  }

  if (item.sectionHint === 'potentially_good') {
    topics.add('Visual inspiration');
  }

  if (topics.size === 0) {
    topics.add('AI product & UX patterns');
  }

  return [...topics];
}

function inferTags(item: ReturnType<typeof parseResearchTxt>[0]): string[] {
  const tags = new Set<string>();
  const comment = (item.userComment ?? '').toLowerCase();

  if (item.statusHint) tags.add(item.statusHint);
  if (comment.includes('watch later')) tags.add('watch_later');
  if (comment.includes('implement')) tags.add('implement');
  if (comment.includes('great') || comment.includes('really good')) tags.add('starred');
  if (comment.includes('generic')) tags.add('generic');
  if (comment.includes('follow')) tags.add('follow');

  return [...tags];
}

const content = readFileSync(INPUT, 'utf-8');
const parsed = parseResearchTxt(content);

const payload = {
  $schema: 'thinkboard-bulk-import-v1' as const,
  research: {
    name: 'AI Design',
    description:
      'Taste, agency AI playbooks, UX patterns, brand differentiation, and visual inspiration — curated design research.',
  },
  topics: [
    { name: 'Taste & the AI paradox' },
    { name: 'Agency AI playbooks' },
    { name: 'AI product & UX patterns' },
    { name: 'Brand as differentiator' },
    { name: 'Visual inspiration' },
    { name: 'Anti-patterns' },
  ],
  entries: parsed.map((item) => {
    const topics = inferTopics(item);
    const tags = inferTags(item);
    const entry: Record<string, unknown> = {
      status: 'inbox',
      fetch: !!item.sourceUrl,
      topics,
    };

    if (item.type === 'note') {
      entry.type = 'note';
      entry.title = item.title ?? 'Note';
      if (item.userComment) entry.comment = item.userComment;
    } else {
      entry.url = item.sourceUrl;
      if (item.userComment) entry.comment = item.userComment;
    }

    if (tags.length) entry.tags = tags;

    return entry;
  }),
  options: {
    fetchArticles: false,
    defaultStatus: 'inbox',
    skipDuplicates: true,
  },
};

writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), 'utf-8');
console.log(`Wrote ${payload.entries.length} entries to ${OUTPUT}`);
