# Aimprint — Claude Context

## What this is
A Claude Code token usage tracker. Syncs local JSONL session logs to Cloudflare D1 and displays a React dashboard with breakdown by project, model, machine, category (work type), and ticket.

## Repos structure
- `src/` — React 19 + TypeScript + Vite + Tailwind CSS 4 frontend
- `worker/` — Cloudflare Worker (D1 backend, auth, API routes)
- `sync/` — Node.js sync agent (parses ~/.claude/projects/*.jsonl)
- `docs/obsidian/` — Obsidian vault (product + architecture docs)

## Key rules
- All D1 queries MUST filter by `user_id` — multi-tenant, no cross-user data leakage
- Sync token values must never be returned in full after creation (list shows prefix only)
- Firebase ID token verified in Worker via `auth.ts` before any data access
- Sync agent: deduplicate by `requestId`, never re-parse lines before the cursor offset

## Graphify
- Before answering architecture questions, read `graphify-out/GRAPH_REPORT.md`
- After modifying source files, run: `npx graphify` to regenerate the graph

## Dev workflow
```bash
npm run worker:dev    # local Worker on port 8787
npm run dev           # Vite frontend proxies /api to :8787
npm run sync          # run sync agent (needs sync/.env)
```

## Deploy
```bash
npm run worker:deploy  # deploy Cloudflare Worker
# push to main → GitHub Actions auto-deploys frontend to GitHub Pages
```

## Critical files
| File | Purpose |
|---|---|
| `worker/db.ts` | All D1 queries — always use .bind(), always filter user_id |
| `worker/auth.ts` | Firebase JWT verification |
| `worker/routes.ts` | All API handlers |
| `sync/classifier.ts` | Session category heuristics |
| `sync/index.ts` | Main sync logic + cursor management |
| `src/App.tsx` | Root state, data fetching, layout |
| `src/services/api.ts` | All Worker API calls from frontend |
