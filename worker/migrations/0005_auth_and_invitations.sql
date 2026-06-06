-- Add user_id column to sessions for authentication binding
ALTER TABLE sessions ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Create invitation_codes table for beta testing control
CREATE TABLE IF NOT EXISTS invitation_codes (
  code TEXT PRIMARY KEY,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert initial test invitation codes
INSERT OR IGNORE INTO invitation_codes (code, max_uses, used_count) VALUES ('RETHINK-BETA-001', 1, 0);
INSERT OR IGNORE INTO invitation_codes (code, max_uses, used_count) VALUES ('RETHINK-BETA-002', 1, 0);
INSERT OR IGNORE INTO invitation_codes (code, max_uses, used_count) VALUES ('RETHINK-BETA-003', 1, 0);
INSERT OR IGNORE INTO invitation_codes (code, max_uses, used_count) VALUES ('RETHINK-BETA-ADMIN', 999, 0);
