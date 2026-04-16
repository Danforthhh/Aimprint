CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT 'default',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS token_usage (
  request_id     TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  session_id     TEXT NOT NULL,
  timestamp      TEXT NOT NULL,
  date           TEXT NOT NULL,
  machine        TEXT NOT NULL DEFAULT 'unknown',
  project        TEXT NOT NULL DEFAULT 'unknown',
  cwd            TEXT,
  model          TEXT NOT NULL DEFAULT 'unknown',
  entrypoint     TEXT,
  git_branch     TEXT,
  ticket         TEXT,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_read     INTEGER NOT NULL DEFAULT 0,
  cache_creation INTEGER NOT NULL DEFAULT 0,
  is_sidechain   INTEGER NOT NULL DEFAULT 0,
  cost_usd       REAL    NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_meta (
  session_id      TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other',
  category_source TEXT NOT NULL DEFAULT 'auto',
  first_message   TEXT,
  tool_summary    TEXT,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tu_user     ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tu_date     ON token_usage(date);
CREATE INDEX IF NOT EXISTS idx_tu_project  ON token_usage(project);
CREATE INDEX IF NOT EXISTS idx_tu_machine  ON token_usage(machine);
CREATE INDEX IF NOT EXISTS idx_tu_model    ON token_usage(model);
CREATE INDEX IF NOT EXISTS idx_tu_ticket   ON token_usage(ticket);
CREATE INDEX IF NOT EXISTS idx_tu_sidechain ON token_usage(is_sidechain);
CREATE INDEX IF NOT EXISTS idx_tu_session  ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_sm_user     ON session_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_sm_category ON session_meta(category);
CREATE INDEX IF NOT EXISTS idx_st_user     ON sync_tokens(user_id);
