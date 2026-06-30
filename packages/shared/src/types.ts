export type ResearchStatus = 'active' | 'archived';
export type EntryType = 'article' | 'article_manual' | 'note' | 'reference';
export type EntryStatus =
  | 'draft'
  | 'published'
  | 'starred'
  | 'implement'
  | 'watch_later'
  | 'potentially_good'
  | 'generic'
  | 'inbox';
export type CommentSource = 'typed' | 'voice_transcript' | 'import';

export interface Research {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ResearchStatus;
  createdAt: string;
  entryCount?: number;
  topicCount?: number;
}

export interface Topic {
  id: string;
  researchId: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  sortOrder: number;
}

export interface Trail {
  id: string;
  researchId: string;
  name: string;
  description: string | null;
}

export interface TrailNode {
  id: string;
  trailId: string;
  entryId: string;
  parentNodeId: string | null;
  position: number;
  entry?: EntryCard;
}

export interface EntryComment {
  id: string;
  entryId: string;
  body: string;
  source: CommentSource;
  createdAt: string;
}

export interface EntryCard {
  id: string;
  researchId: string;
  type: EntryType;
  title: string;
  sourceUrl: string | null;
  excerpt: string | null;
  heroImage: string | null;
  author: string | null;
  publishedAt: string | null;
  status: EntryStatus;
  createdAt: string;
  userComment?: string | null;
  topics?: Topic[];
  tags?: { id: string; name: string }[];
}

export interface EntryDetail extends EntryCard {
  fullTextMd: string | null;
  comments: EntryComment[];
  trails?: Trail[];
}

export interface CapturePreview {
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

export interface ExportPayload {
  research: Research;
  topics: Topic[];
  trails: Array<Trail & { nodes: Array<{ entryId: string; title: string; userComment: string | null; url: string | null }> }>;
  entries: Array<{
    id: string;
    type: EntryType;
    title: string;
    url: string | null;
    excerpt: string | null;
    userComment: string | null;
    fullTextMd: string | null;
    status: EntryStatus;
    tags: string[];
    topics: string[];
  }>;
}
