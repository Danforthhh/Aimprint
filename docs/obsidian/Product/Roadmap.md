# Roadmap

## v1 (current scope)
- [x] JSONL sync agent with cursor-based incremental sync
- [x] Cloudflare Worker + D1 backend with Firebase Auth
- [x] Session classification (8 categories, local heuristics)
- [x] Dashboard: daily chart, category chart, project/model/machine/ticket breakdowns
- [x] Sub-agent breakdown (direct vs sidechain)
- [x] Period-over-period comparison badges
- [x] Session table with manual re-categorization
- [x] CSV export
- [x] Multi-user with sync tokens
- [x] Onboarding tutorial in-app
- [x] GitHub Actions auto-deploy

## v2 (backlog)
- [ ] Weekly email digest (Cloudflare Cron Trigger + Resend)
- [ ] Budget alerts ("you've used 80% of your weekly target")
- [ ] Session detail view (per-request token breakdown within a session)
- [ ] Team view (aggregate dashboard across multiple users)
- [ ] Improved classification with optional Haiku-based enrichment (opt-in)
- [ ] npm package for the sync agent (`npx aimprint-sync`)
