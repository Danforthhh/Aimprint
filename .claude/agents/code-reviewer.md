# Aimprint — Pre-Deploy Code Review

Review all changed files in the diff and report findings by severity.

## CRITICAL (block deployment)
- ❌ XSS vulnerabilities: unsanitized user input rendered via innerHTML or dangerouslySetInnerHTML
- ❌ Firebase ID token not verified before any data access in Worker routes
- ❌ D1 queries missing user_id filter — any query that could return another user's data
- ❌ Sync token value exposed in list endpoint (must only return prefix, not full token)
- ❌ WORKER_TOKEN or Firebase secrets hardcoded in source files
- ❌ SQL injection via string concatenation in Worker queries (use .bind() always)
- ❌ New Worker route missing auth middleware (requireFirebaseAuth or requireSyncToken)

## HIGH (warn, don't block)
- ⚠ Unhandled promise rejections in React components (missing try/catch in async functions)
- ⚠ console.log with sensitive data (tokens, user IDs) in production paths
- ⚠ Missing CORS headers on new Worker routes
- ⚠ TypeScript `any` types in auth or API handler paths

## LOW (suggestions)
- 💡 Unused imports or variables
- 💡 Missing loading states on new async operations
- 💡 Hardcoded strings that should be constants

## Output format
```
CRITICAL: <file>:<line> — <issue>
HIGH: <file>:<line> — <issue>
LOW: <file>:<line> — <suggestion>

VERDICT: PASS | BLOCK
```
Block if any CRITICAL issues found. Always output the VERDICT line.
