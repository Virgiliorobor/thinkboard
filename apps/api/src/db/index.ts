import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://magazine:magazine@localhost:5433/research_magazine';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export async function closeDb() {
  await client.end();
}
