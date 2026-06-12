# Adding a Machine

## Prerequisites
- Node.js 18+ installed
- Claude Code installed and used at least once (creates ~/.claude/projects/)
- A deployed Aimprint instance (see [[Deploy]])

## Steps

### 1. Get a sync token
Log into the Aimprint dashboard → Settings → Generate Sync Token → copy the token (shown once).

### 2. Create config file
Create `~/.aimprint` with two lines:
```
WORKER_URL=https://aimprint.vin-bories.workers.dev
SYNC_TOKEN=<your-token-from-step-1>
```

### 3. Run first sync
```bash
npx aimprint-sync
```

No install needed — `npx` downloads and runs the package directly.

### 4. Automate (optional)
Add to `~/.claude/settings.json` to sync after every Claude Code session:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx aimprint-sync"
      }]
    }]
  }
}
```

## Multiple laptops, same account
Repeat steps 2–3 on each machine using the same sync token. They'll all appear as separate entries in the "machine" filter (identified by hostname).

To manage machines independently, generate a separate token per machine with a descriptive label (e.g. "Work MacBook", "Home laptop").

## Legacy: git clone setup
If you previously cloned the repo, the agent still works — it falls back to `sync/.env` automatically. No migration needed.
