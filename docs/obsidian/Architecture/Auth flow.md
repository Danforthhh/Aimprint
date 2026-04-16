# Auth Flow

## Dashboard users (Firebase Auth)

```
1. User signs in via Firebase (email/password)
2. Firebase returns an ID token (JWT, 1h expiry)
3. Dashboard includes token in Authorization: Bearer <token>
4. Worker calls verifyFirebaseToken() → validates JWT signature via Google JWKS
5. Worker extracts uid + email → upserts user in D1 → filters all queries by uid
```

Firebase ID tokens are cached by the Firebase SDK and auto-refreshed. The Worker's JWKS fetch is cached via Cloudflare's cache API (1h TTL).

## Sync agent (sync tokens)

```
1. User generates a sync token via dashboard (Settings → Generate Sync Token)
2. Worker stores token + user_id in sync_tokens table
3. Sync agent includes token in X-Sync-Token header on POST /ingest
4. Worker calls lookupSyncToken() → resolves to user_id → inserts under that user
```

Sync tokens are long random strings (64 hex chars). They never expire unless manually revoked. The full token is shown only once at generation time; the list endpoint returns only the first 8 chars as a prefix for identification.

## Security properties
- **Cross-user data leakage:** impossible — all D1 queries filter by `user_id` derived from the verified Firebase token
- **Sync token compromise:** revocable from dashboard (Settings → Revoke); token is deleted from D1
- **Firebase token replay:** mitigated by 1h expiry and Google's automatic JWKS key rotation
- **CORS:** Worker restricts `Access-Control-Allow-Origin` to `https://danforthhh.github.io` and `localhost` ports — enforced in `worker/index.ts` for all responses
- **Input validation:** all query params bounded (`days` 0–3650, `limit` 1–500); all `/ingest` records sanitized (non-negative token counts, valid string IDs); categories validated against enum before DB write

## JWT verification implementation note
Firebase ID tokens are verified using the **JWK endpoint** (not X.509 PEM):
```
https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
```
This returns keys in JWK format directly importable by the Web Crypto API (`crypto.subtle.importKey('jwk', ...)`). The Cloudflare Worker caches this response for 1h.
