-- Pre-aggregated rollup: one row per (user, session, day, model, sidechain flag, raw request_category,
-- machine, project, ticket). Every column buildWhere filters or queryByDimension groups on is in the key,
-- so filtered/per-dimension totals stay exact. ticket uses '' for "no ticket" (NULLs never conflict in a PK).
-- Dashboard queries read this instead of token_usage (10-30x fewer rows read on D1 free tier).
-- Column names match token_usage so db.ts queries only swap the table name.
CREATE TABLE IF NOT EXISTS usage_rollup (
  user_id          TEXT NOT NULL,
  session_id       TEXT NOT NULL,
  date             TEXT NOT NULL,
  model            TEXT NOT NULL DEFAULT 'unknown',
  is_sidechain     INTEGER NOT NULL DEFAULT 0,
  request_category TEXT NOT NULL DEFAULT '',
  machine          TEXT NOT NULL DEFAULT 'unknown',
  project          TEXT NOT NULL DEFAULT 'unknown',
  ticket           TEXT NOT NULL DEFAULT '',
  git_branch       TEXT,
  last_timestamp   TEXT NOT NULL,
  requests         INTEGER NOT NULL DEFAULT 0,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0,
  cache_read       INTEGER NOT NULL DEFAULT 0,
  cache_creation   INTEGER NOT NULL DEFAULT 0,
  cost_usd         REAL    NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, session_id, date, model, is_sidechain, request_category, machine, project, ticket)
);
CREATE INDEX IF NOT EXISTS idx_ur_user_date ON usage_rollup(user_id, date);

-- Backfill from raw rows. To repair drift later: DELETE FROM usage_rollup; re-run this INSERT; then re-apply
-- `npm run reprice` output (this INSERT copies token_usage.cost_usd, which reprice does not touch).
INSERT INTO usage_rollup
  (user_id, session_id, date, model, is_sidechain, request_category, machine, project, ticket,
   git_branch, last_timestamp, requests, input_tokens, output_tokens, cache_read, cache_creation, cost_usd)
SELECT user_id, session_id, date, model, is_sidechain, request_category, machine, project, COALESCE(ticket, ''),
       MIN(git_branch), MAX(timestamp),
       COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(cache_read), SUM(cache_creation), SUM(cost_usd)
FROM token_usage
GROUP BY user_id, session_id, date, model, is_sidechain, request_category, machine, project, COALESCE(ticket, '');
