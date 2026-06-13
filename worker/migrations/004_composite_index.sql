-- Composite index on (user_id, date) for the most common query pattern.
-- All usage/totals/sessions queries filter by user_id and date range;
-- two separate single-column indexes force SQLite to pick one and scan the other.
CREATE INDEX IF NOT EXISTS idx_tu_user_date ON token_usage(user_id, date);
