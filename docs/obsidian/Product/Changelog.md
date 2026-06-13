# Changelog

## v1.4.0 — 2026-06

### Security audit #2 + bug fixes

**Bug fixes:**
- **Worker bare 500 with no CORS headers**: unhandled exceptions in route handlers caused Cloudflare to return its own error response with zero custom headers, making the browser report a CORS error instead of the real problem. Added top-level try/catch to the fetch handler — all errors now return CORS-compliant JSON `{"error":"..."}`.
- **`queryAgentCalls` SQL scope bug**: outer SELECT referenced `sm.tool_summary` but `sm` is only defined in the inner subquery. Fixed to reference the column as `tool_summary` (the name the subquery exposes).

**Security hardening (audit #2):**
- **HSTS**: added `Strict-Transport-Security: max-age=31536000; includeSubDomains` to all Worker responses
- **Permissions-Policy**: added `camera=(), microphone=(), geolocation=()` to all Worker responses
- **CSP connect-src narrowed**: replaced wildcard `*.googleapis.com` and `*.workers.dev` with exact endpoints (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebaseappcheck.googleapis.com`, `firebaseinstallations.googleapis.com`, `aimprint.vin-bories.workers.dev`); removed unused `*.cloudfunctions.net` and `wss://*.firebaseio.com`
- **Sync token label sanitization**: labels validated against printable ASCII allowlist; `<`, `>`, `&` rejected server-side to prevent stored XSS
- **CSV export hardened**: row cap lowered to 2,000; `days=0` (all-time) no longer accepted — prevents Worker timeout on large datasets
- **Build-time env assertions**: `vite.config.ts` now throws if required env vars (`VITE_WORKER_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`) are missing in production builds
- **App Check warning**: explicit `console.error` if `VITE_RECAPTCHA_SITE_KEY` is missing in a production build instead of silently skipping
- **`queryByDimension` allowlist**: replaced `Object.values().includes()` check with `hasOwnProperty` to prevent prototype pollution bypassing the column allowlist
- **Password minimum**: new registrations require 8 characters (up from Firebase's default 6); login is not affected

## v1.3.0 — 2026-06

### npx install + security hardening

**npx @danforthh/aimprint-sync** — no more git clone needed to set up a new machine:
- Published as standalone npm package `@danforthh/aimprint-sync`
- Config lives in `~/.aimprint` (falls back to `sync/.env` for existing users)
- Setup: create `~/.aimprint`, run `npx @danforthh/aimprint-sync`
- Auto-sync hook: `Stop` event, command `npx @danforthh/aimprint-sync`

**Security fixes** (full audit performed):
- **Account deletion order fixed (critical)**: D1 data and sync tokens are now deleted first while the JWT is valid, then Firebase account second — prevents orphaned sync tokens that could continue posting after deletion
- **Sync token delete: minimum prefix length**: 8–64 chars enforced, preventing ambiguous 1-char prefix matches
- **Ingest `first_message`/`tool_summary` bounded**: capped at 500/1000 chars at the worker; `tool_summary` validated as JSON before storage
- **Per-user token limit**: max 20 sync tokens per account
- **Env parser whitelist**: `~/.aimprint` parser now only accepts `WORKER_URL` and `SYNC_TOKEN` keys — prevents `NODE_OPTIONS` injection
- **Symlink traversal guard**: JSONL scan resolves real paths and rejects files outside `~/.claude/projects/`
- **SQL column runtime allowlist**: `queryDistinct` now asserts column name at runtime (defence-in-depth over TypeScript types)
- **CSV `Cache-Control: no-store`**: prevents proxy/browser caching of personal usage exports

## v1.2.0 — 2026-06

### Password reset + repo URL fix
- **Password reset**: "Forgot password?" link on the login screen sends a Firebase password reset email. Firebase silently succeeds for unknown emails (prevents enumeration). Shows a confirmation banner on success.
- **Repo URL fix**: setup instructions in `OnboardingPage` and `SettingsModal` were pointing to `vin-bories/Aimprint` — corrected to `Danforthhh/Aimprint`.

## v1.1.0 — 2026-04

### Multi-machine onboarding + sub-agent counter
- **Setup instructions on token generation**: generating a new sync token in Settings now shows the full setup guide (git clone, pre-filled `sync/.env`, `npm run sync`) directly in the modal — no need to re-read the docs when adding a new machine.
- **Sub-agent calls counter**: replaced the empty "No ticket data yet" box with a live counter of Agent tool calls, pulled from `tool_summary` in D1. Shows total calls and number of sessions that used sub-agents.
- **Automated deploy pipeline**: TypeScript check now also triggers on `git push`; PostToolUse hook auto-updates Changelog + Setup docs after every commit or deploy; hook patterns extended to cover `npm run worker:deploy`.

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
