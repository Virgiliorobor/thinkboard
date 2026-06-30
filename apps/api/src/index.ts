import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';

const port = Number(process.env.API_PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(cookie);
  await app.register(jwt, {
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  });

  await app.register(multipart);

  app.get('/api/health', async () => ({ ok: true }));

  await registerRoutes(app);

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
