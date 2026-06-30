import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const researches = pgTable('researches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  isPrivate: boolean('is_private').notNull().default(false),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    coverImage: text('cover_image'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('topics_research_idx').on(t.researchId)]
);

export const trails = pgTable(
  'trails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    rootEntryId: uuid('root_entry_id'),
    isPrivate: boolean('is_private').notNull().default(false),
    passwordHash: text('password_hash'),
  },
  (t) => [index('trails_research_idx').on(t.researchId)]
);

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('article'),
    title: text('title').notNull(),
    sourceUrl: text('source_url'),
    fullTextMd: text('full_text_md'),
    excerpt: text('excerpt'),
    heroImage: text('hero_image'),
    author: text('author'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    status: text('status').notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('entries_research_idx').on(t.researchId),
    index('entries_status_idx').on(t.status),
  ]
);

export const entryComments = pgTable(
  'entry_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    source: text('source').notNull().default('typed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('entry_comments_entry_idx').on(t.entryId)]
);

export const trailNodes = pgTable(
  'trail_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trailId: uuid('trail_id')
      .notNull()
      .references(() => trails.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    parentNodeId: uuid('parent_node_id'),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('trail_nodes_trail_idx').on(t.trailId)]
);

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

export const entryTags = pgTable(
  'entry_tags',
  {
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] })]
);

export const entryTopics = pgTable(
  'entry_topics',
  {
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.topicId] })]
);
