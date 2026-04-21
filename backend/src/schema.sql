CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS markets (
  id              INTEGER PRIMARY KEY,
  question        TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  closing_time    INTEGER NOT NULL,
  resolution_time INTEGER NOT NULL,
  outcome         INTEGER NOT NULL DEFAULT 0,
  resolved        INTEGER NOT NULL DEFAULT 0,
  creator         TEXT    NOT NULL,
  created_at_block INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pool_snapshots (
  market_id        INTEGER PRIMARY KEY,
  yes_reserve      TEXT    NOT NULL,
  no_reserve       TEXT    NOT NULL,
  total_collateral TEXT    NOT NULL,
  updated_at_block INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trades (
  tx_hash             TEXT    NOT NULL,
  log_index           INTEGER NOT NULL,
  block_number        INTEGER NOT NULL,
  timestamp           INTEGER NOT NULL,
  market_id           INTEGER NOT NULL,
  user_addr           TEXT    NOT NULL,
  kind                TEXT    NOT NULL,
  is_yes              INTEGER NOT NULL,
  collateral          TEXT    NOT NULL,
  shares              TEXT    NOT NULL,
  new_yes_probability REAL    NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_trades_market ON trades (market_id, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user   ON trades (user_addr, block_number DESC);

CREATE TABLE IF NOT EXISTS resolutions (
  market_id    INTEGER PRIMARY KEY,
  outcome      INTEGER NOT NULL,
  resolver     TEXT    NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  tx_hash      TEXT    NOT NULL,
  log_index    INTEGER NOT NULL,
  market_id    INTEGER NOT NULL,
  user_addr    TEXT    NOT NULL,
  amount       TEXT    NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp    INTEGER NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_claims_market ON claims (market_id);
CREATE INDEX IF NOT EXISTS idx_claims_user   ON claims (user_addr);
