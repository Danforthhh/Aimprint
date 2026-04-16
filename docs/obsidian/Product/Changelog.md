# Changelog

## v1.0.0 — 2026-04

### Initial release
- JSONL sync agent with cursor-based incremental sync across multiple machines
- Cloudflare Worker + D1 backend (free tier)
- Firebase Auth (email/password, multi-user)
- Session classification into 8 categories (local heuristics, no API cost)
- React dashboard with:
  - Daily token chart with period-over-period comparison
  - Category breakdown (pie chart)
  - Sub-agent vs direct usage breakdown
  - Breakdowns by project, model, machine, ticket
  - Session table with manual re-categorization
  - Filters: period, project, model, machine, category, ticket
  - CSV export
- Sync tokens for multi-machine, multi-user sync
- Onboarding tutorial in-app
- Frontend deployed on GitHub Pages via `npm run deploy`
- Pre-deploy code review hook (`.claude/settings.json`)
- Auto-sync hook on Claude Code SessionStart

### Security hardening (post-launch)
- Fixed Firebase JWT verification (JWK endpoint instead of broken X.509 path)
- Restricted CORS to known origins (GitHub Pages + localhost)
- Added input bounds on all query parameters
- Added record sanitization on `/ingest`
- Fixed session batch/sessionMeta alignment bug in sync agent
- Added retry with exponential backoff to sync agent
- Fixed session merge: backfills model/cwd/gitBranch/entrypoint across files
