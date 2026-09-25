# Data Model

## Tables

### `users`
One row per registered user. Created on first login via Firebase.
```
user_id    TEXT PK   — Firebase UID
email      TEXT
created_at TEXT
```

### `sync_tokens`
API tokens used by sync agents on each machine.
```
token      TEXT PK   — 64-char hex random string
user_id    TEXT FK   — maps to users.user_id
label      TEXT      — human label (e.g. "Work laptop")
created_at TEXT
```
Full token only returned at creation time. List returns first 8 chars as prefix.

### `token_usage`
One row per Claude API request (deduplicated by `request_id`).
```
request_id        TEXT PK   — from JSONL requestId field
user_id           TEXT FK
session_id        TEXT      — Claude Code session UUID
timestamp         TEXT      — ISO 8601
date              TEXT      — YYYY-MM-DD (for daily grouping)
machine           TEXT      — os.hostname() from sync agent
project           TEXT      — basename of cwd
cwd               TEXT      — full working directory
model             TEXT      — e.g. claude-opus-4-6
entrypoint        TEXT      — e.g. claude-desktop
git_branch        TEXT      — from JSONL gitBranch field
ticket            TEXT      — extracted from git_branch (e.g. PROTOP-1523)
input_tokens      INTEGER
output_tokens     INTEGER
cache_read        INTEGER   — cache_read_input_tokens
cache_creation    INTEGER   — cache_creation_input_tokens
is_sidechain      INTEGER   — 0 or 1 (isSidechain in JSONL)
cost_usd          REAL      — estimated API-equivalent cost
request_category  TEXT      — per-request category ('' = inherit session category at query time)
```

`request_category` uses a hybrid resolution strategy: strong tool signals (Edit/Write → `code_writing`, OPS bash → `code_process`, TodoWrite → `planning`) are stored directly. Weak signals (read-only turns, pure conversation) store `''` and resolve at query time via:
```sql
COALESCE(NULLIF(tu.request_category, ''), sm.category, 'other')
```
See [[Classification]] for full details.

Since 2026-09 `token_usage` is **write-only**: `/ingest` inserts into it (dedup via the `(request_id, user_id)` primary key) and account deletion clears it. No dashboard query reads it, and its secondary indexes were dropped (migration 007) because D1 bills every index entry as a row written. `cost_usd` here is the price at ingest time and is not repriced.

### `usage_rollup`
Pre-aggregated copy of `token_usage` that every dashboard query reads (migration 006). One row per `(user_id, session_id, date, model, is_sidechain, request_category, machine, project, ticket)` — every filterable dimension is in the key, so filters and breakdowns stay exact while rows read per query drop 10–30×.
```
user_id, session_id, date, model, is_sidechain, request_category,
machine, project, ticket           — composite PRIMARY KEY (ticket is '' when absent)
git_branch        TEXT
last_timestamp    TEXT      — MAX(timestamp) of the group; sessions list sorts on it
requests          INTEGER   — COUNT of raw rows in the group
input_tokens, output_tokens, cache_read, cache_creation  INTEGER — SUMs
cost_usd          REAL      — SUM; recompute with `npm run reprice` after a pricing change
```
`/ingest` pairs each raw `INSERT OR IGNORE` with an `ON CONFLICT DO UPDATE ... + excluded` upsert in the same D1 batch, gated on `changes() > 0`, so retries never double count. To rebuild from raw: `DELETE FROM usage_rollup`, re-run the INSERT..SELECT in `006_usage_rollup.sql`, then reprice.

### `session_meta`
One row per session. Category and first message.
```
session_id      TEXT PK
user_id         TEXT FK
category        TEXT    — one of 8 categories (see Classification)
category_source TEXT    — 'auto' or 'manual'
first_message   TEXT    — first 500 chars of first user message (for classifier)
tool_summary    TEXT    — JSON: {edit:N, bash:N, read:N, todo:N, agent:N}
updated_at      TEXT
```
