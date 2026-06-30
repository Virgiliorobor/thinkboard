import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, closeDb } from './index.js';

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS researches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS topics_research_idx ON topics(research_id);

CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'article',
  title TEXT NOT NULL,
  source_url TEXT,
  full_text_md TEXT,
  excerpt TEXT,
  hero_image TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entries_research_idx ON entries(research_id);
CREATE INDEX IF NOT EXISTS entries_status_idx ON entries(status);

CREATE TABLE IF NOT EXISTS trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  root_entry_id UUID
);
CREATE INDEX IF NOT EXISTS trails_research_idx ON trails(research_id);

CREATE TABLE IF NOT EXISTS trail_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  parent_node_id UUID,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trail_nodes_trail_idx ON trail_nodes(trail_id);

CREATE TABLE IF NOT EXISTS entry_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'typed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entry_comments_entry_idx ON entry_comments(entry_id);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS entry_topics (
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, topic_id)
);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(full_text_md, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS entries_search_idx ON entries USING GIN(search_vector);

ALTER TABLE researches ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS password_hash TEXT;
`;

async function migrate() {
  console.log('Running migrations...');
  await db.execute(sql.raw(MIGRATION_SQL));
  console.log('Migrations complete.');
  await closeDb();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
