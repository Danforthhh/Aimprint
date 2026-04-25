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

## New machine setup

**At the start of every session, check:**
1. Does `/c/Code/.cloudflare-token` exist? → `ls /c/Code/.cloudflare-token`
2. If missing → run `npm install` (installs git hooks + prompts for passphrase to decrypt token from dotfiles)
3. Token comes from `github.com/Danforthhh/dotfiles` (private, encrypted with AES-256)

> If this is a brand-new clone, `npm install` handles everything. If it's an existing clone that predates this setup, run `npm install` once to install the git hooks — after that every `git pull` checks automatically.

## Dev workflow
```bash
npm run worker:dev    # local Worker on port 8787
npm run dev           # Vite frontend proxies /api to :8787
npm run sync          # run sync agent (needs sync/.env)
```

## Deploy pipeline

Every change goes through this sequence — steps 1–3 are enforced automatically via `.claude/settings.json` hooks:

| Step | Trigger | How |
|------|---------|-----|
| 1. TypeScript check | `git push` or `npm run deploy` | PreToolUse command hook — blocks on errors |
| 2. Code review | `npm run deploy` or `wrangler deploy` | PreToolUse agent hook — blocks on CRITICAL findings |
| 3. Docs update | After `git commit` / `npm run deploy` / `wrangler deploy` | PostToolUse agent hook — updates Changelog.md, Setup docs, CLAUDE.md |
| 4. Push to main | `git push` | GitHub Actions builds + deploys frontend to GitHub Pages |
| 5. Worker deploy | `npm run worker:deploy` | Manual — only needed when `worker/` files changed |

```bash
# Frontend change
git commit -m "..."   # → doc-updater runs automatically
git push              # → tsc check, then GitHub Actions deploys

# Worker change
git commit -m "..."
npm run worker:deploy  # → tsc check + code review + doc-updater, then deploys
```

> `npm run deploy` (gh-pages direct) is kept for one-off deploys without a push, but **push to main is the canonical path** — GitHub Actions handles the build with proper secrets.

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
