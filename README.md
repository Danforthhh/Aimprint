# Aimprint — Your AI usage footprint

Track and understand your Claude Code token consumption across machines, projects, and types of work.

**Live dashboard → [danforthhh.github.io/Aimprint](https://danforthhh.github.io/Aimprint/)**

---

## What it does

Claude Code's `/cost` only tells you "you're using your subscription." Aimprint gives you the full picture:

- **How many tokens** you consumed, by day / project / model / machine
- **What type of work** drove your usage (code writing, deep analysis, refactoring, planning…)
- **This week vs last week** — period-over-period comparison on every view
- **Sub-agent breakdown** — what % of your tokens came from direct use vs Claude's background agents
- **Ticket-level tracking** — tokens per feature branch / Jira ticket
- **All your machines in one view** — sync from as many laptops as you want

Everything runs on free infrastructure. The tracker itself costs zero tokens to operate.

---

## Architecture

```
~/.claude/projects/*.jsonl          # Claude Code session logs (local)
        │
        ▼
  sync agent (Node.js)              # runs on each machine, classifies sessions
        │  POST /ingest
        ▼
  Cloudflare Worker + D1            # multi-tenant API + SQLite storage (free tier)
        │  GET /api/*
        ▼
  React dashboard (GitHub Pages)    # charts, filters, session table
        │
  Firebase Auth                     # email/password login, per-user data isolation
```

---

## Quick start

### 1. Register
Go to **[danforthhh.github.io/Aimprint](https://danforthhh.github.io/Aimprint/)** → create an account.

### 2. Get a sync token
Settings → **Generate Sync Token** → copy it (shown once).

### 3. Configure the sync agent

Create `~/.aimprint` with two lines:
```
WORKER_URL=https://aimprint.vin-bories.workers.dev
SYNC_TOKEN=<your-token>
```

### 4. Run your first sync

No install needed — `npx` downloads and runs the agent directly:

```bash
npx @danforthh/aimprint-sync
```

### 5. Automate (optional)

Add to `~/.claude/settings.json` to sync automatically after every Claude Code session:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx @danforthh/aimprint-sync"
      }]
    }]
  }
}
```

### Multiple machines
Repeat steps 2–4 on each machine using the same sync token. All machines appear separately in the "machine" filter.

> **Existing git clone users:** the agent falls back to `sync/.env` automatically — no migration needed.

---

## Session categories

Sessions are classified locally by the sync agent — no external API calls, zero token cost.

| Category | What it means |
|---|---|
| **Code writing** | Implementing features, writing new code |
| **Code process** | CI/CD, deployments, Docker, builds |
| **Quality** | Tests, linting, code review, security |
| **Deep analysis** | Codebase exploration, architecture, research |
| **Refinement** | Refactoring, simplifying, cleaning up |
| **Planning** | PRDs, tickets, strategy, roadmaps |
| **Random** | Quick questions, short sessions |
| **Other** | Doesn't fit a clear pattern |

You can manually re-assign any session's category from the session table.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts |
| Auth | Firebase Auth (email/password) |
| API + storage | Cloudflare Worker + D1 (SQLite) — free tier |
| Sync agent | Node.js + TypeScript (tsx) |
| Deployment | GitHub Pages (`npm run deploy`) |

---

## Self-hosting

Want to run your own instance? See [`docs/obsidian/Setup/Deploy.md`](docs/obsidian/Setup/Deploy.md) for the full setup guide (Cloudflare + Firebase + GitHub Pages, all free).

---

## Privacy

- Conversation content **never leaves your machine** — only token counts and metadata are synced
- First message text (up to 500 chars) is used locally for session classification and stored in the cloud under your account only
- No third-party analytics, no ads
