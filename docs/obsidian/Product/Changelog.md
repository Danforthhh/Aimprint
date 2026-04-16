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

### Per-request classification + quality pass
- **Per-request category classification**: each assistant turn now classified individually based on the tools called in that turn (`classifyRequest` in `sync/classifier.ts`). Strong signals (Edit/Write, OPS bash, TodoWrite) produce a category; weak signals (read-only, conversation) store `''` and resolve at query time via `COALESCE(NULLIF(request_category,''), session_category, 'other')`. Fixes ~53% `code_process` inflation caused by one deploy command tagging an entire coding session.
- **D1 migration 002**: added `request_category TEXT DEFAULT ''` column + index on `token_usage`
- **Account deletion**: full stack delete — Firebase `deleteUser()` first (fails fast on re-auth), then D1 batch delete across all four tables. Accessible from Settings → Danger zone with two-step confirmation.
- **Critical bug fix**: `queryDailyUsage` had `${join}` referencing an undefined variable — `ReferenceError` at runtime, breaking the daily chart and totals for all users.
- **Worker type-checking**: added `worker/` to root `tsconfig.json` project references so `tsc -b` now covers all code (was previously unchecked, allowing the join bug to ship).
- **Filter consistency**: category breakdown and subagent charts now respect project/model/machine/ticket filters (previously only respected `days`).
- **Tooltip dark theme**: added `itemStyle` and `labelStyle` to all Recharts `<Tooltip>` components — was showing black text on dark background.
- **CategoryBadge**: click-outside closes the dropdown; API failures show a 3-second inline error tooltip.
- **`src/utils/format.ts`**: extracted `fmtTokens` / `fmtCost` from 6 copy-pasted definitions into a shared utility.
- **Auth hardening**: Firebase JWT now validates all 6 required claims (`exp`, `iat`, `auth_time`, `aud`, `iss`, `sub`).
- **Input sanitization**: `request_id` length cap (128), `request_category` type-checked before enum lookup, `rawSessions` capped at 1000, `Content-Type` header only sent when request has a body.
