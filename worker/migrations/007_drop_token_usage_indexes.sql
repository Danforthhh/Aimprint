-- token_usage is write-only since migration 006: dashboard reads use usage_rollup, and the only
-- remaining statements are INSERT OR IGNORE (served by the PRIMARY KEY) and DELETE ... WHERE user_id.
-- D1 counts every index entry as a row written, so these 9 indexes cost ~9 extra writes per synced
-- record against the 100k rows-written/day free-tier limit. Drop them.
DROP INDEX IF EXISTS idx_tu_date;
DROP INDEX IF EXISTS idx_tu_project;
DROP INDEX IF EXISTS idx_tu_machine;
DROP INDEX IF EXISTS idx_tu_model;
DROP INDEX IF EXISTS idx_tu_ticket;
DROP INDEX IF EXISTS idx_tu_sidechain;
DROP INDEX IF EXISTS idx_tu_session;
DROP INDEX IF EXISTS idx_tu_user_date;
DROP INDEX IF EXISTS idx_token_usage_req_cat;
