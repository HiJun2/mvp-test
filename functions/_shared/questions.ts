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
  sort_order: number;
  is_active: number;
};

export type PublicQuestionRow = QuestionRow & {
  type_title: string;
  type_sort_order: number;
};

type SettingRow = {
  value: string;
};

export const DEFAULT_BREATH_GOAL = 50;

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
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (type_id) REFERENCES question_types(id) ON DELETE CASCADE
    )`,
  ).run();

  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_questions_type_order ON questions(type_id, sort_order)",
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ).run();
}

export async function getBreathGoal(db: D1Database) {
  await ensureQuestionTables(db);
  const row = await db.prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind("breath_goal")
    .first<SettingRow>();
  const goal = Number(row?.value ?? DEFAULT_BREATH_GOAL);
  return Number.isFinite(goal) && goal > 0 ? Math.round(goal) : DEFAULT_BREATH_GOAL;
}

export async function setBreathGoal(db: D1Database, goal: number) {
  const safeGoal = Number.isFinite(goal) && goal > 0 ? Math.round(goal) : DEFAULT_BREATH_GOAL;
  await ensureQuestionTables(db);
  await db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at`,
  )
    .bind("breath_goal", String(safeGoal), new Date().toISOString())
    .run();
  return safeGoal;
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
