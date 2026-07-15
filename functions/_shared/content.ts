import type { D1Database } from "./types";

export const VISIBLE_CATEGORY_ORDER = ["사건", "시간", "사랑", "장소"] as const;

export const DEFAULT_CATEGORIES = [
  { key: "memory", name: "기억", icon: "brain", color: "#8a9860", visible: false },
  { key: "person", name: "사람", icon: "user-round", color: "#9b6d9f", visible: false },
  { key: "place", name: "장소", icon: "map-pin", color: "#3488c9", visible: true },
  { key: "emotion", name: "감정", icon: "sparkles", color: "#c06f7f", visible: false },
  { key: "event", name: "사건", icon: "calendar-star", color: "#f06a2a", visible: true },
  { key: "meaning", name: "의미", icon: "leaf", color: "#536f66", visible: false },
  { key: "lesson", name: "배움", icon: "book-open", color: "#6f8fb9", visible: false },
  { key: "transition", name: "전환", icon: "route", color: "#b89b45", visible: false },
  { key: "value", name: "가치", icon: "gem", color: "#7b76b9", visible: false },
  { key: "gratitude", name: "감사", icon: "flower-2", color: "#6e9a70", visible: false },
  { key: "relationship", name: "관계", icon: "users-round", color: "#c0845a", visible: false },
  { key: "philosophy", name: "철학", icon: "lightbulb", color: "#5d83a6", visible: false },
  { key: "legacy", name: "유산", icon: "gift", color: "#a87457", visible: false },
  { key: "time", name: "시간", icon: "clock-3", color: "#4f7b48", visible: true },
  { key: "love", name: "사랑", icon: "heart", color: "#ed4164", visible: true },
] as const;

export type CategoryRow = {
  key: string;
  name: string;
  icon: string;
  color: string;
  app_visible: number;
};

export type ContentImageRow = {
  id: string;
  scope: "daily" | "breath_intro" | "question";
  question_id: string | null;
  r2_key: string;
  description: string;
  version: number;
  created_at: string;
  is_active: number;
};

export type DailyPromptRow = {
  id: string;
  question: string;
  helper_text: string;
  image_id: string | null;
  is_active: number;
};

export async function ensureContentTables(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS categories (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      app_visible INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS content_images (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK (scope IN ('daily', 'breath_intro', 'question')),
      question_id TEXT,
      r2_key TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
    )`,
  ).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_content_images_target
    ON content_images(scope, question_id, is_active, version DESC)`,
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS daily_prompts (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      helper_text TEXT NOT NULL,
      image_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (image_id) REFERENCES content_images(id) ON DELETE SET NULL
    )`,
  ).run();

  const now = new Date().toISOString();
  for (const category of DEFAULT_CATEGORIES) {
    await db.prepare(
      `INSERT OR IGNORE INTO categories
      (key, name, icon, color, app_visible, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        category.key,
        category.name,
        category.icon,
        category.color,
        category.visible ? 1 : 0,
        now,
      )
      .run();
  }

  await db.prepare(
    `INSERT OR IGNORE INTO daily_prompts
    (id, question, helper_text, image_id, is_active, created_at)
    VALUES (?, ?, ?, NULL, 1, ?)`,
  )
    .bind(
      "daily_default",
      "지금 날씨는 어때?",
      "밖의 날씨를 보며 오늘의 기분을 이야기해 주세요.",
      now,
    )
    .run();
}

export async function getActiveImage(
  db: D1Database,
  scope: ContentImageRow["scope"],
  questionId: string | null = null,
) {
  const query = questionId
    ? `SELECT id, scope, question_id, r2_key, description, version, created_at, is_active
       FROM content_images
       WHERE scope = ? AND question_id = ? AND is_active = 1
       ORDER BY version DESC LIMIT 1`
    : `SELECT id, scope, question_id, r2_key, description, version, created_at, is_active
       FROM content_images
       WHERE scope = ? AND question_id IS NULL AND is_active = 1
       ORDER BY version DESC LIMIT 1`;
  const statement = db.prepare(query);
  return questionId
    ? statement.bind(scope, questionId).first<ContentImageRow>()
    : statement.bind(scope).first<ContentImageRow>();
}

export function toClientImage(image: ContentImageRow | null) {
  if (!image) {
    return null;
  }
  return {
    id: image.id,
    description: image.description,
    version: image.version,
    createdAt: image.created_at,
    imageUrl: `/api/images/${image.id}`,
  };
}
