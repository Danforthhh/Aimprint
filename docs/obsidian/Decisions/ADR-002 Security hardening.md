# ADR-002 — Security hardening decisions

**Date:** 2026-04  
**Status:** Decided

## Context
After initial implementation and deployment, a full security review was conducted. Several decisions were made about how to handle auth, CORS, and input validation in a public multi-user app deployed on free-tier infrastructure.

## Decisions

### Firebase JWT verification via JWK (not X.509)
**Decision:** Use `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` instead of the X.509 PEM endpoint.

**Reason:** The Web Crypto API's `crypto.subtle.importKey('jwk', ...)` accepts JWK format directly. The X.509 endpoint returns full certificates — the DER-encoded public key is nested inside and cannot be passed directly to `importKey('spki', ...)`. The JWK endpoint is simpler and avoids certificate parsing entirely.

### CORS restricted to known origins
**Decision:** `Access-Control-Allow-Origin` is set to the specific GitHub Pages domain + localhost, not `*`. Enforced in `worker/index.ts` for all responses (including the response body, not just the preflight).

**Reason:** While Firebase tokens prevent unauthorized data reads even with `*` CORS, restricting origins is defense-in-depth and avoids leaking usage metadata to third-party scripts running on other tabs.

### Input bounds on all query parameters
**Decision:** `days` is clamped to 0–3650 (0 = all time), `limit` to 1–500, `offset` to ≥ 0.

**Reason:** D1 has free-tier query limits. An unbounded `days=99999999` would generate expensive queries with no legitimate use case. Clamping prevents accidental or malicious exhaustion.

### Sync token prefix-based revocation (acceptable risk)
**Decision:** Sync tokens are identified in the UI by their first 8 hex characters. Revocation uses prefix matching on the server.

**Reason:** With 64-char random hex tokens, the probability of two tokens sharing the same 8-char prefix is 1/4,294,967,296. This is acceptable for personal/small-team usage. The simplicity of prefix-based deletion outweighs the theoretical collision risk.

### Session categories clamped on ingest (not rejected)
**Decision:** If the sync agent sends an unrecognized category, it is silently clamped to `'other'` rather than rejecting the entire batch.

**Reason:** The sync agent and Worker may be at different versions during upgrades. Rejecting unknown categories would break syncs during rolling updates. Clamping preserves data while maintaining integrity.
