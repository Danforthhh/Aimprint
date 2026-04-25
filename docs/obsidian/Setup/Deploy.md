# Deploying Aimprint

## Prerequisites
- Node.js 22+
- Wrangler CLI: `npm install -g wrangler`
- A Cloudflare account (free)
- A Firebase project (free, create at console.firebase.google.com)

## 1. Create Cloudflare D1 database
```bash
wrangler login
wrangler d1 create aimprint-db
# Copy the database_id from the output
```

Update `worker/wrangler.toml` with the `database_id`.

## 2. Run migrations
```bash
npm run worker:migrate         # production
npm run worker:migrate:local   # local dev
```

## 3. Set Worker secrets
```bash
wrangler secret put WORKER_TOKEN        # any long random string
wrangler secret put FIREBASE_PROJECT_ID # your Firebase project ID
```

## 4. Deploy Worker
```bash
npm run worker:deploy
# Note the URL: https://aimprint.<subdomain>.workers.dev
```

## 5. Configure Firebase
1. Create a Firebase project at console.firebase.google.com
2. Enable Authentication → Email/Password
3. Get config from Project Settings → Web Apps
4. Create `.env.local` from `.env.example` and fill in the values

## 6. Configure GitHub Pages
In your GitHub repo → Settings → Pages → Source: **Deploy from a branch** → branch `gh-pages` → `/ (root)` → Save.

## 7. Deploy the frontend

**Canonical path — push to main:**
```bash
git push origin main
# GitHub Actions builds with proper secrets and deploys to GitHub Pages automatically
```

**One-off direct deploy (no push):**
```bash
npm run deploy
# Builds locally and pushes dist/ to the gh-pages branch directly
# Requires a local .env with all VITE_* variables
```

The site is available at: `https://<your-github-username>.github.io/Aimprint/`

## Day-to-day deploy pipeline

Each of these steps is enforced automatically via `.claude/settings.json` hooks when working inside Claude Code:

| Step | When | Automatic? |
|------|------|------------|
| TypeScript check | `git push` or `npm run deploy` | Yes — blocks on errors |
| Code review | `npm run deploy` or `wrangler deploy` | Yes — blocks on CRITICAL findings |
| Docs update | After any commit or deploy | Yes — updates Changelog.md + Setup docs |
| Frontend deploy | `git push` to main | Yes — GitHub Actions |
| Worker deploy | `npm run worker:deploy` | Manual — only when `worker/` changed |

## Notes
- The Firebase Web API key (VITE_FIREBASE_API_KEY) is embedded in the built JS — this is expected for Firebase web apps. Restrict it to your GitHub Pages domain in Google Cloud Console → APIs & Services → Credentials → HTTP referrers.
- CORS on the Worker is restricted to `https://<your-github-username>.github.io` and `localhost` ports. If you deploy to a different domain, update `ALLOWED_ORIGINS` in `worker/index.ts` and redeploy.
