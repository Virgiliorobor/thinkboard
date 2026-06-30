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

Repo: [github.com/Virgiliorobor/thinkboard](https://github.com/Virgiliorobor/thinkboard)

### Coolify setup

1. **+ New Resource** → **Docker Compose** (not “Application”)
2. **Source:** GitHub → `Virgiliorobor/thinkboard` → branch **main**
3. **Base Directory:** `/` (leave empty or `/`)
4. **Docker Compose location** (this fixes “Please load a Compose file”):
   - Try **`compose.yaml`** first, or **`docker-compose.yml`**
   - Click **Reload** / **Load Compose File** if the UI has that button
5. **Environment variables** (Coolify → Environment):
   ```
   POSTGRES_USER=thinkboard
   POSTGRES_PASSWORD=<long-random>
   POSTGRES_DB=thinkboard
   EDITOR_PASSWORD=<your-editor-secret>
   SESSION_SECRET=<long-random>
   PUBLIC_API_URL=https://your-domain.com
   ```
6. **Domain:** assign your domain to the **`web`** service (port **80** inside the container). The nginx config proxies `/api` to the api service.
7. **Deploy** → migrations run automatically when the **api** container starts (see `docker-entrypoint.sh`).
8. **Seed data:** use the web UI (Editor login → New research → upload `links and research.txt` → Inbox). Do not use `db:seed` on the server.

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
