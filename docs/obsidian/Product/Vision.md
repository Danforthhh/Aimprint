# Vision

**Aimprint** gives you a clear picture of your Claude Code token consumption — across machines, projects, and types of work.

## Problem
Claude Code gives no visibility into how tokens are consumed. `/cost` only shows "you're using your subscription." There's no way to know which projects consume the most, what type of work drives usage, or how usage varies across laptops.

## Solution
A lightweight sync agent reads local Claude Code session logs on each machine and pushes them to a shared cloud backend. A React dashboard makes sense of the data with breakdowns by project, model, work category, and ticket.

## Who it's for
Individual developers and teams using Claude Code who want to understand their usage patterns. Anyone who wants to track token consumption across multiple machines without paying per token for the tracker itself.

## Principles
- **Zero AI cost to operate** — no Claude API calls, no token cost to run the tracker
- **Privacy by design** — conversation content never leaves the machine; only metadata and token counts are synced
- **Free infrastructure** — Cloudflare Workers + D1 + GitHub Pages, all free tier
- **Multi-user** — each user has isolated data; share the app with your team
