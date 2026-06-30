/** Thinkboard bulk-import JSON format (v1). See docs/bulk-import.example.json */

export type BulkImportSchemaVersion = 'thinkboard-bulk-import-v1';

export interface BulkImportTopic {
  name: string;
  description?: string;
  slug?: string;
}

export interface BulkImportEntry {
  url?: string;
  title?: string;
  comment?: string;
  excerpt?: string;
  fullTextMd?: string;
  type?: 'article' | 'article_manual' | 'note' | 'reference';
  status?:
    | 'draft'
    | 'published'
    | 'starred'
    | 'implement'
    | 'watch_later'
    | 'potentially_good'
    | 'generic'
    | 'inbox';
  topics?: string[];
  tags?: string[];
  fetch?: boolean;
}

export interface BulkImportOptions {
  fetchArticles?: boolean;
  defaultStatus?: BulkImportEntry['status'];
  skipDuplicates?: boolean;
}

export interface BulkImportPayload {
  $schema?: BulkImportSchemaVersion;
  research?: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
  };
  topics?: BulkImportTopic[];
  entries: BulkImportEntry[];
  options?: BulkImportOptions;
}
