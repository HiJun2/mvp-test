import { errorResponse } from "./http";
import type { D1Database, Env } from "./types";

export type QuestionTypeRow = {
  id: string;
  title: string;
  sort_order: number;
  is_active: number;
};

export type QuestionRow = {
  id: string;
  type_id: string;
  category: string;
  question: string;
  helper_text: string;
  sort_order: number;
  is_active: number;
};

export type PublicQuestionRow = QuestionRow & {
  type_title: string;
  type_sort_order: number;
  category_key: string;
  category_icon: string;
  category_color: string;
  image_id: string | null;
  image_description: string | null;
  image_version: number | null;
};

export async function ensureQuestionTables(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS question_types (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS questions (
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
    )`,
  ).run();

  try {
    await db.prepare(
      "ALTER TABLE questions ADD COLUMN helper_text TEXT NOT NULL DEFAULT '당신의 기억과 감정을 자유롭게 이야기해 주세요.'",
    ).run();
  } catch {
    // Existing databases already have the column after the first migration.
  }

  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_questions_type_order ON questions(type_id, sort_order)",
  ).run();
}

export function requireAdmin(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD) {
    return errorResponse("ADMIN_PASSWORD 환경변수가 필요해요.", 500);
  }

  const password = request.headers.get("x-admin-password") ?? "";
  if (password !== env.ADMIN_PASSWORD) {
    return errorResponse("관리자 비밀번호를 확인해 주세요.", 401);
  }

  return null;
}
