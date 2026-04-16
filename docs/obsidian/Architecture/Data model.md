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
