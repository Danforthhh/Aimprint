# Classification

Sessions and individual requests are classified locally by the sync agent. No external API calls, no token cost.

## Categories
| Category | Description |
|---|---|
| `code_writing` | Implementing features, writing new code |
| `code_process` | CI/CD, deployments, Docker, builds, ops |
| `quality` | Tests, linting, code review, security |
| `deep_analysis` | Codebase exploration, architecture review, research |
| `refinement` | Refactoring, simplifying, cleaning up |
| `planning` | PRDs, tickets, strategy, roadmaps |
| `random` | Quick questions, short sessions |
| `other` | Doesn't fit a clear pattern |

---

## Per-request classification (`classifyRequest`)

Each individual assistant turn is classified based on the tools it called in **that turn** (not the whole session). Stored in `token_usage.request_category`.

### Strong signals — always produce a category
| Signal | Category |
|---|---|
| Bash with OPS command (docker, wrangler deploy, kubectl…) | `code_process` |
| Bash with QUAL command (jest, eslint, npm test…) | `quality` |
| TodoWrite called | `planning` |
| Edit / Write / NotebookEdit called | `code_writing` |

### Weak signals — store `''`, resolved at query time
| Signal | Stored value |
|---|---|
| Read / Grep / Glob only | `''` (inherit session category) |
| No tools (pure conversation) | `''` after message keyword fallback |
| Message keyword fallback fails | `''` |

### Hybrid query-time resolution
```sql
COALESCE(NULLIF(tu.request_category, ''), sm.category, 'other')
```
Turns with `''` fall back to the session's category. This preserves context for exploratory turns (e.g. reading files mid-coding session still counts as `code_writing`) without exploding the `other` bucket.

---

## Session-level classification (`classify`)

After all per-request classification, the sync agent also classifies the **session as a whole** for the `session_meta.category` field. This is the fallback for per-request `''` values and is used for the session table display.

### Algorithm (`sync/classifier.ts`)

1. **Count tool calls** across the entire session: Edit/Write, Bash, Read/Grep/Glob, TodoWrite, Agent
2. **Analyze bash commands** — count OPS patterns (docker, wrangler, git push) and QUAL patterns (jest, eslint)
3. **Compute OPS ratio** — `code_process` only wins if OPS commands are a significant share of bash activity (`opsCount >= 2` OR `opsRatio >= 0.3`). Prevents a single deploy at the end of a coding session from tagging the whole session.
4. **Keyword match** on first user message (stored locally, max 500 chars)
5. **Score signals** — each category gets a score; highest score wins
6. **No-signal fallback** — if all scores are 0, fall back on tool mix (edit > 2 → `code_writing`, read > 5 → `deep_analysis`, requestCount ≤ 4 → `random`, else `other`)

Short sessions (≤3 requests, ≤2 total tools, <3 min) are classified as `random` immediately, before scoring.

---

## Manual override
Users can re-assign any session's category from the session table in the dashboard. This sets `category_source = 'manual'` in D1, which is preserved across future syncs (upsert uses `INSERT OR REPLACE` but manual assignments are not re-classified by the sync agent).
