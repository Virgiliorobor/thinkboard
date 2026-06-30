export interface ParsedImportItem {
  sourceUrl?: string;
  title?: string;
  userComment?: string;
  pastedExcerpt?: string;
  statusHint?: string;
  sectionHint?: string;
  type: 'article' | 'note' | 'reference';
}

const URL_RE = /^https?:\/\/\S+/i;

function inferStatus(comment: string): string | undefined {
  const lower = comment.toLowerCase();
  if (lower.includes('watch later')) return 'watch_later';
  if (lower.includes('implement')) return 'implement';
  if (lower.includes('great') || lower.includes('really good')) return 'starred';
  if (lower.includes('generic')) return 'generic';
  return undefined;
}

export function parseResearchTxt(content: string): ParsedImportItem[] {
  const lines = content.split(/\r?\n/);
  const items: ParsedImportItem[] = [];
  let buffer: string[] = [];
  let sectionHint: string | undefined;

  const flushBuffer = (): string => {
    const text = buffer.join('\n').trim();
    buffer = [];
    return text;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^potentially good$/i.test(line)) {
      sectionHint = 'potentially_good';
      continue;
    }
    if (/^previous ok, now generic$/i.test(line)) {
      sectionHint = 'generic';
      continue;
    }

    const urlMatch = line.match(/^(https?:\/\/\S+?)(\s+##\s*(.+))?$/i);
    if (urlMatch) {
      const pasted = flushBuffer();
      const url = urlMatch[1].replace(/[#,]+$/, '');
      const inlineComment = urlMatch[3]?.trim();
      items.push({
        sourceUrl: url,
        userComment: [pasted, inlineComment].filter(Boolean).join('\n\n') || undefined,
        pastedExcerpt: pasted || undefined,
        statusHint: inlineComment ? inferStatus(inlineComment) : sectionHint,
        sectionHint,
        type: 'article',
      });
      continue;
    }

    if (line.startsWith('##') && !URL_RE.test(line)) {
      const noteText = line.replace(/^#+\s*/, '').trim();
      if (noteText && !noteText.match(/^this is something/i)) {
        buffer.push(noteText);
      } else if (noteText.match(/customs control tower/i)) {
        sectionHint = 'customs-control-tower';
        items.push({
          type: 'note',
          title: 'Customs control tower patterns',
          userComment: noteText,
          sectionHint,
        });
      }
      continue;
    }

    if (URL_RE.test(line)) {
      const pasted = flushBuffer();
      items.push({
        sourceUrl: line.split(/\s+/)[0],
        pastedExcerpt: pasted || undefined,
        userComment: pasted || undefined,
        sectionHint,
        type: 'article',
      });
      continue;
    }

    buffer.push(line);
  }

  const remaining = flushBuffer();
  if (remaining && !items.some((i) => i.pastedExcerpt === remaining)) {
    items.push({
      type: 'note',
      title: remaining.slice(0, 80),
      userComment: remaining,
      sectionHint,
    });
  }

  const deduped = new Map<string, ParsedImportItem>();
  for (const item of items) {
    const key = item.sourceUrl ?? `note:${item.title}`;
    const existing = deduped.get(key);
    if (existing) {
      existing.userComment = [existing.userComment, item.userComment].filter(Boolean).join('\n\n');
      if (item.statusHint) existing.statusHint = item.statusHint;
    } else {
      deduped.set(key, { ...item });
    }
  }

  return [...deduped.values()];
}
