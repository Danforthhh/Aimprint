# Adding a Machine

## Prerequisites
- Node.js 22+ installed
- Claude Code installed and used at least once (creates ~/.claude/projects/)
- A deployed Aimprint instance (see [[Deploy]])

## Steps

### 1. Get a sync token
Log into the Aimprint dashboard → Settings → Generate Sync Token → copy the token (shown once).

### 2. Install the sync agent
```bash
git clone https://github.com/Danforthhh/Aimprint
cd Aimprint
npm install
cp sync/.env.example sync/.env
```

Edit `sync/.env`:
```
WORKER_URL=https://aimprint.vin-bories.workers.dev
SYNC_TOKEN=<your-token-from-step-1>
```

### 3. Run first sync
```bash
npm run sync
```

### 4. Automate (recommended)
Add to `~/.claude/settings.json` (global Claude Code settings):
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "npm run sync --prefix /path/to/Aimprint >> ~/.claude/aimprint-sync.log 2>&1 &",
        "timeout": 30
      }]
    }]
  }
}
```

Replace `/path/to/Aimprint` with the actual clone path (e.g. `C:/Code/Aimprint` on Windows or `~/Aimprint` on macOS/Linux).

This syncs automatically at the start of each Claude Code session. Logs go to `~/.claude/aimprint-sync.log`.

## Multiple laptops, same account
Use the same sync token on all machines. They'll all appear as separate entries in the "machine" filter of the dashboard (identified by hostname).

To manage machines independently, generate a separate token per machine with a descriptive label (e.g. "Work MacBook", "Home laptop").
