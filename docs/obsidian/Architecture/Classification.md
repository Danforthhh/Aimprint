# Session Classification

Sessions are classified locally by the sync agent into 8 categories. No external API calls.

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

## Algorithm (sync/classifier.ts)

1. **Count tool calls** per session type: Edit/Write, Bash, Read/Grep/Glob, TodoWrite, Agent
2. **Analyze bash commands** — detect ops patterns (docker, wrangler, git push) and quality patterns (jest, eslint)
3. **Keyword match** on the first user message (stored locally, max 500 chars)
4. **Score signals** — each category gets a score based on the above
5. **Pick highest score** → category

Short sessions with few tools (<3 requests, <3 tools, <3 min) are classified as `random`.

## Manual override
Users can re-assign any session's category from the session table in the dashboard. This sets `category_source = 'manual'` in D1, which is preserved on future syncs.
