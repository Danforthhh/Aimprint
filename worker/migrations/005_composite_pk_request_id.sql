-- Scope request_id uniqueness to (request_id, user_id) instead of globally.
-- Previously a user creating a second account could not re-sync records already
-- claimed by their first account, because request_id was a global PRIMARY KEY.
CREATE TABLE token_usage_new (
  request_id       TEXT NOT NULL,
  user_id          TEXT NOT NULL,
  session_id       TEXT NOT NULL,
  timestamp        TEXT NOT NULL,
  date             TEXT NOT NULL,
  machine          TEXT NOT NULL DEFAULT 'unknown',
  project          TEXT NOT NULL DEFAULT 'unknown',
  cwd              TEXT,
  model            TEXT NOT NULL DEFAULT 'unknown',
  entrypoint       TEXT,
  git_branch       TEXT,
  ticket           TEXT,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0,
  cache_read       INTEGER NOT NULL DEFAULT 0,
  cache_creation   INTEGER NOT NULL DEFAULT 0,
  is_sidechain     INTEGER NOT NULL DEFAULT 0,
  cost_usd         REAL    NOT NULL DEFAULT 0,
  request_category TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (request_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT INTO token_usage_new SELECT * FROM token_usage;
DROP TABLE token_usage;
ALTER TABLE token_usage_new RENAME TO token_usage;

CREATE INDEX IF NOT EXISTS idx_tu_user         ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tu_date         ON token_usage(date);
CREATE INDEX IF NOT EXISTS idx_tu_project      ON token_usage(project);
CREATE INDEX IF NOT EXISTS idx_tu_machine      ON token_usage(machine);
CREATE INDEX IF NOT EXISTS idx_tu_model        ON token_usage(model);
CREATE INDEX IF NOT EXISTS idx_tu_ticket       ON token_usage(ticket);
CREATE INDEX IF NOT EXISTS idx_tu_sidechain    ON token_usage(is_sidechain);
CREATE INDEX IF NOT EXISTS idx_tu_session      ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_tu_user_date    ON token_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_token_usage_req_cat ON token_usage(user_id, request_category);
