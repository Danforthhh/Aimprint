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

## 6. Add GitHub Secrets (for auto-deploy)
In your GitHub repo → Settings → Secrets:
- `VITE_WORKER_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions.

## 7. Push to main
```bash
git push origin main
# GitHub Actions builds and deploys to GitHub Pages automatically
```
