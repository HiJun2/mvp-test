CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'breath')),
  question TEXT NOT NULL,
  question_id TEXT,
  question_type_index INTEGER,
  question_index INTEGER,
  category TEXT,
  question_type TEXT,
  question_type_title TEXT,
  duration_seconds INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  image_id TEXT,
  image_r2_key TEXT,
  image_version INTEGER,
  image_description TEXT,
  local_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_records_user_created_at
ON records(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_records_daily_date
ON records(user_id, local_date)
WHERE type = 'daily' AND local_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS question_types (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  type_id TEXT NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  helper_text TEXT NOT NULL DEFAULT '당신의 기억과 감정을 자유롭게 이야기해 주세요.',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (type_id) REFERENCES question_types(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_type_order
ON questions(type_id, sort_order);

CREATE TABLE IF NOT EXISTS categories (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  app_visible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS content_images (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('daily', 'breath_intro', 'question')),
  question_id TEXT,
  r2_key TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_images_target
ON content_images(scope, question_id, is_active, version DESC);

CREATE TABLE IF NOT EXISTS daily_prompts (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  helper_text TEXT NOT NULL,
  image_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (image_id) REFERENCES content_images(id) ON DELETE SET NULL
);
