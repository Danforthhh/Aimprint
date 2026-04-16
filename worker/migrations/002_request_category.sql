-- Add per-request category classification column
ALTER TABLE token_usage ADD COLUMN request_category TEXT NOT NULL DEFAULT '';

-- Index for category breakdown queries
CREATE INDEX IF NOT EXISTS idx_token_usage_req_cat ON token_usage(user_id, request_category);
