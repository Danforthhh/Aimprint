# Architecture Overview

## System diagram

```mermaid
graph TD
    A["~/.claude/projects/*.jsonl"] --> B["Sync agent (sync/index.ts)"]
    B --> C["POST /ingest (X-Sync-Token)"]
    C --> D["Cloudflare Worker (worker/index.ts)"]
    D --> E["D1 SQLite (token_usage, session_meta)"]
    F["React dashboard (GitHub Pages)"] --> G["GET /api/* (Firebase ID token)"]
    G --> D
    H["Firebase Auth"] --> F
```

## Components

### Sync agent (`sync/`)
Runs locally on each machine. Reads JSONL files from `~/.claude/projects/`, parses token usage records, classifies sessions, and POSTs to the Worker. Tracks progress via byte-offset cursors in `~/.claude-tracker/cursor.json`.

### Cloudflare Worker (`worker/`)
Stateless HTTP handler. Two auth paths:
- `POST /ingest` — authenticated via `X-Sync-Token` (sync agent)
- `GET /api/*` — authenticated via Firebase ID token (dashboard)

All queries filter by `user_id` for data isolation.

### D1 database
Four tables: `users`, `sync_tokens`, `token_usage`, `session_meta`.
See [[Data model]] for schema.

### React dashboard (`src/`)
Single-page app. Firebase Auth for login. Fetches from Worker on filter change. All charts via Recharts.

## Auth flow
See [[Auth flow]].
