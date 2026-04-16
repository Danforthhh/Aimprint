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
```bash
npm run deploy
# Builds with Vite and pushes dist/ to the gh-pages branch via gh-pages package
# Site available at: https://<your-github-username>.github.io/Aimprint/
```

Run `npm run deploy` after any frontend change to publish the updated dashboard.

## Notes
- The Firebase Web API key (VITE_FIREBASE_API_KEY) is embedded in the built JS — this is expected for Firebase web apps. Restrict it to your GitHub Pages domain in Google Cloud Console → APIs & Services → Credentials → HTTP referrers.
- CORS on the Worker is restricted to `https://<your-github-username>.github.io` and `localhost` ports. If you deploy to a different domain, update `ALLOWED_ORIGINS` in `worker/index.ts` and redeploy.
