# ADR-001 — Cloudflare D1 vs Firestore for storage

**Date:** 2026-04  
**Status:** Decided

## Context
Need a cloud database for storing token usage records from multiple machines per user. Requirements: free tier, low latency queries, SQL-style aggregation, multi-tenant.

## Options considered

### Option A: Cloudflare D1 (chosen)
- SQLite at the edge, free tier: 5GB, 25M reads/day, 5M writes/month
- Native SQL GROUP BY, SUM — perfect for aggregation queries
- Co-located with the Cloudflare Worker
- No separate billing

### Option B: Firestore
- Already used in Spyke and Wandr for document storage
- Free tier: 50k reads/day, 20k writes/day
- Poor for aggregation — would need client-side grouping or Cloud Functions
- Separate Firebase project needed

### Option C: PlanetScale / Turso
- More powerful but adds cost and complexity beyond what's needed here

## Decision
**Cloudflare D1.** The aggregation queries (GROUP BY date, model, project, etc.) map naturally to SQL. D1's free tier is sufficient for personal + small team usage. Keeping everything in Cloudflare (Worker + D1) simplifies deployment.

Firebase Auth is still used for user authentication (best-in-class email/password flows, proven in Spyke and Wandr) but Firestore is not used for data storage.
