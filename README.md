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
8. **Seed data:** use the web UI — Editor login → New research → upload bulk JSON (see **Bulk import** below) or legacy `.txt` → Inbox. Do not use `db:seed` on the server.

### Fix: `password authentication failed for user "thinkboard"`

Postgres sets the password **only on first boot**. If you changed `POSTGRES_*` in Coolify after the first deploy, the old password remains in the `pgdata` volume.

1. **Stop** the Thinkboard stack in Coolify
2. **Delete the postgres volume** (`pgdata`) — Storages / Persistent Storage / Volumes for this resource
3. Confirm Environment (same password for postgres + api):
   ```
   POSTGRES_USER=thinkboard
   POSTGRES_PASSWORD=<one-password>
   POSTGRES_DB=thinkboard
   ```
4. **Redeploy** — look in api logs for `Migrations complete.`

## Agent export

Authenticated GET:

```
GET /api/export/:research-slug
```

Returns full JSON corpus for Claude Co-work.

## Bulk import (JSON)

Thinkboard accepts a structured JSON file for bulk uploads — better than raw `.txt` when your notes are messy. Convert messy research with an AI, then import via the UI.

**Example file:** [`docs/bulk-import.example.json`](docs/bulk-import.example.json)

**Ready-made import for AI Design research:** [`docs/ai-design-bulk-import.json`](docs/ai-design-bulk-import.json) — generated from `links and research.txt`. Re-run locally with `npm run convert:txt` in `apps/api`.

### JSON schema (`thinkboard-bulk-import-v1`)

```json
{
  "$schema": "thinkboard-bulk-import-v1",
  "research": {
    "name": "AI Design",
    "description": "Optional — used when creating a new research"
  },
  "topics": [
    { "name": "Taste & the AI paradox" }
  ],
  "entries": [
    {
      "url": "https://example.com/article",
      "comment": "Your note about this link",
      "topics": ["Taste & the AI paradox"],
      "tags": ["starred"],
      "status": "inbox",
      "fetch": true
    },
    {
      "type": "note",
      "title": "Standalone thought",
      "comment": "No URL — just a note block"
    }
  ],
  "options": {
    "fetchArticles": true,
    "defaultStatus": "inbox",
    "skipDuplicates": true
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `entries` | yes | At least one entry |
| `entries[].url` | no* | Article link; Thinkboard can fetch title/excerpt when `fetch: true` |
| `entries[].comment` | no | Your annotation (from `##` notes, pasted text, etc.) |
| `entries[].title` | no | Override scraped title |
| `entries[].type` | no | `article`, `note`, `reference` — inferred from URL if omitted |
| `entries[].status` | no | Default `inbox` (review before publish). Also: `starred`, `implement`, `watch_later`, `published` |
| `entries[].topics` | no | Topic names — created if missing |
| `entries[].tags` | no | Tag names — created if missing |
| `entries[].fetch` | no | Per-entry override; set `false` to skip scraping |
| `topics` | no | Pre-create topic tabs before entries |
| `options.fetchArticles` | no | Default `true` — set `false` for fast import of many URLs |
| `options.skipDuplicates` | no | Default `true` — skip URLs already in this research |

\* Each entry needs at least one of: `url`, `title`, or `comment`.

### How to import

1. **New research:** Editor login → **+ New research** → attach `.json` (or `.txt` legacy)
2. **Existing research:** Open magazine → **Import JSON** → paste or upload file → **Import to inbox**
3. Review in **Inbox** → publish entries you want public

API (editor auth required):

```
POST /api/researches/:slug/bulk-import
Content-Type: application/json

{ ...bulk import payload... }
```

### AI prompt — convert messy notes to JSON

Copy this prompt into Claude (or any LLM), then paste your messy links file below it. Save the output as `my-research.json` and upload in Thinkboard.

```
You convert messy research notes into Thinkboard bulk-import JSON.

Output ONLY valid JSON (no markdown fences, no commentary). Use schema "thinkboard-bulk-import-v1".

Rules:
1. Every http/https URL becomes an entry with "url" and "comment" (combine inline ## notes and nearby paragraph text).
2. Text blocks without URLs become entries with "type": "note", "title" (first ~80 chars), and "comment" (full text).
3. Section headers (e.g. "Potentially good", "Previous ok, now generic") become topic names in "topics" array AND assign matching entries via entries[].topics.
4. Infer tags from comment language:
   - "watch later" → tag "watch_later"
   - "implement" → tag "implement"
   - "great" / "really good" / "starred" → tag "starred"
   - "generic" → tag "generic"
5. Default all entries to "status": "inbox" unless clearly ready to publish.
6. Set "fetch": true on URL entries (Thinkboard will scrape metadata).
7. Deduplicate URLs — merge comments if the same URL appears twice.
8. Include top-level "research.name" and "research.description" if inferrable from the notes.
9. Include "options": { "fetchArticles": true, "defaultStatus": "inbox", "skipDuplicates": true }

Example entry:
{ "url": "https://...", "comment": "Great framing on taste", "topics": ["Taste & the AI paradox"], "tags": ["starred"], "status": "inbox", "fetch": true }

Now convert the following messy research notes:

--- PASTE YOUR MESSY TEXT BELOW THIS LINE ---
```

## Project structure

```
apps/api     Fastify + Drizzle + PostgreSQL
apps/web     React + Vite + Tailwind (Flipboard-inspired)
```
