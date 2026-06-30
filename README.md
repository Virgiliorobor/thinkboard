# Thinkboard

Personal research magazine — Flipboard-inspired UI, structured database, multi-research support.

**Repo:** [github.com/Virgiliorobor/thinkboard](https://github.com/Virgiliorobor/thinkboard)

## Quick start (local)

### 1. Start PostgreSQL

```powershell
cd _projects/research-magazine
copy .env.example .env
# Edit .env — set EDITOR_PASSWORD and SESSION_SECRET

docker compose up postgres -d
```

### 2. API

```powershell
cd apps/api
npm install
npm run db:migrate
npm run dev
```

### 3. Web

```powershell
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173 — no login needed to browse. Use **Editor login** to create content.

Set `EDITOR_PASSWORD` in `.env` (not `AUTH_PASSWORD`).

### 4. Seed your AI Design research (optional)

With Postgres running and migrations applied:

```powershell
cd apps/api
npm run db:seed
```

Then open the research inbox and publish entries.

## Docker (Coolify)

Push to GitHub, connect repo in Coolify, set env vars from `.env.example`, deploy `docker-compose.yml`.

- Web: port 5173 (or your domain)
- API: port 3001 (proxied via nginx in web container)

## Agent export

Authenticated GET:

```
GET /api/export/:research-slug
```

Returns full JSON corpus for Claude Co-work.

## Project structure

```
apps/api     Fastify + Drizzle + PostgreSQL
apps/web     React + Vite + Tailwind (Flipboard-inspired)
```
