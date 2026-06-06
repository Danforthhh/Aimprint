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
Create `.claude/settings.local.json` at the root of your Aimprint clone (this file is gitignored — it's yours alone):
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm run sync"
          }
        ]
      }
    ]
  }
}
```

This triggers the sync automatically after every Claude Code response, keeping your dashboard up to date in real time while you work. The hook runs in the project root so no path configuration is needed.

## Multiple laptops, same account
Use the same sync token on all machines. They'll all appear as separate entries in the "machine" filter of the dashboard (identified by hostname).

To manage machines independently, generate a separate token per machine with a descriptive label (e.g. "Work MacBook", "Home laptop").
