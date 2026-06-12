-- Store tokens as SHA-256 hashes; add prefix for display and UUID for safe deletion
ALTER TABLE sync_tokens ADD COLUMN token_prefix TEXT;
ALTER TABLE sync_tokens ADD COLUMN token_id TEXT;
