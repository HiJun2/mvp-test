import {
  ensureContentTables,
  getActiveImage,
  toClientImage,
  type CategoryRow,
  type DailyPromptRow,
} from "../../_shared/content";
import { randomId } from "../../_shared/crypto";
import { errorResponse, jsonResponse, readJson } from "../../_shared/http";
import {
  ensureQuestionTables,
  requireAdmin,
  type QuestionRow,
  type QuestionTypeRow,
} from "../../_shared/questions";
import { getDb, type PagesContext } from "../../_shared/types";

type AdminImage = {
  id: string;
  description: string;
  version: number;
  imageUrl: string;
} | null;

type AdminQuestion = {
  id?: string;
  category?: string;
  question?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type AdminQuestionGroup = {
  typeId?: string;
  typeTitle?: string;
  sortOrder?: number;
  isActive?: boolean;
  questions?: AdminQuestion[];
};

type SaveBody = {
  groups?: AdminQuestionGroup[];
  categories?: Array<{
    key?: string;
    icon?: string;
    color?: string;
    appVisible?: boolean;
  }>;
  dailyPrompt?: {
    id?: string;
    question?: string;
    helperText?: string;
    isActive?: boolean;
  };
};

type AdminQuestionRow = QuestionRow & {
  image_id: string | null;
  image_description: string | null;
  image_version: number | null;
};

export async function onRequestGet({ request, env }: PagesContext) {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);

  await ensureQuestionTables(db);
  await ensureContentTables(db);

  const [
    { results: typeRows },
    { results: questionRows },
    { results: categoryRows },
    dailyPrompt,
    dailyImage,
    breathIntroImage,
  ] = await Promise.all([
    db.prepare(
      "SELECT id, title, sort_order, is_active FROM question_types ORDER BY sort_order, created_at",
    ).all<QuestionTypeRow>(),
    db.prepare(
      `SELECT
        questions.id, questions.type_id, questions.category, questions.question,
        questions.sort_order, questions.is_active,
        content_images.id AS image_id,
        content_images.description AS image_description,
        content_images.version AS image_version
      FROM questions
      LEFT JOIN content_images ON content_images.id = (
        SELECT image.id FROM content_images AS image
        WHERE image.scope = 'question'
          AND image.question_id = questions.id
          AND image.is_active = 1
        ORDER BY image.version DESC LIMIT 1
      )
      ORDER BY questions.sort_order, questions.created_at`,
    ).all<AdminQuestionRow>(),
    db.prepare(
      "SELECT key, name, icon, color, app_visible FROM categories ORDER BY created_at",
    ).all<CategoryRow>(),
    db.prepare(
      `SELECT id, question, helper_text, image_id, is_active
      FROM daily_prompts ORDER BY is_active DESC, updated_at DESC, created_at DESC LIMIT 1`,
    ).first<DailyPromptRow>(),
    getActiveImage(db, "daily"),
    getActiveImage(db, "breath_intro"),
  ]);

  return jsonResponse({
    categories: categoryRows.map((row) => ({
      key: row.key,
      name: row.name,
      icon: row.icon,
      color: row.color,
      appVisible: Boolean(row.app_visible),
    })),
    dailyPrompt: dailyPrompt
      ? {
          id: dailyPrompt.id,
          question: dailyPrompt.question,
          helperText: dailyPrompt.helper_text,
          isActive: Boolean(dailyPrompt.is_active),
          image: toClientImage(dailyImage),
        }
      : null,
    breathIntroImage: toClientImage(breathIntroImage),
    groups: typeRows.map((typeRow) => ({
      typeId: typeRow.id,
      typeTitle: typeRow.title,
      sortOrder: typeRow.sort_order,
      isActive: Boolean(typeRow.is_active),
      questions: questionRows
        .filter((questionRow) => questionRow.type_id === typeRow.id)
        .map((questionRow) => ({
          id: questionRow.id,
          category: questionRow.category,
          question: questionRow.question,
          sortOrder: questionRow.sort_order,
          isActive: Boolean(questionRow.is_active),
          image: questionRow.image_id
            ? ({
                id: questionRow.image_id,
                description: questionRow.image_description ?? "",
                version: questionRow.image_version ?? 1,
                imageUrl: `/api/images/${questionRow.image_id}`,
              } satisfies NonNullable<AdminImage>)
            : null,
        })),
    })),
  });
}

export async function onRequestPost({ request, env }: PagesContext) {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);

  const body = await readJson<SaveBody>(request);
  if (!body) return errorResponse("저장할 관리 데이터가 필요해요.");

  await ensureQuestionTables(db);
  await ensureContentTables(db);
  const now = new Date().toISOString();

  if (Array.isArray(body.categories)) {
    for (const category of body.categories) {
      const key = normalizeId(category.key);
      if (!key) continue;
      await db.prepare(
        `UPDATE categories SET icon = ?, color = ?, app_visible = ?, updated_at = ?
        WHERE key = ?`,
      )
        .bind(
          category.icon?.trim() || "circle",
          normalizeColor(category.color),
          category.appVisible ? 1 : 0,
          now,
          key,
        )
        .run();
    }
  }

  if (body.dailyPrompt) {
    const promptId = normalizeId(body.dailyPrompt.id) || "daily_default";
    const question = body.dailyPrompt.question?.trim() ?? "";
    const helperText = body.dailyPrompt.helperText?.trim() ?? "";
    if (!question || !helperText) {
      return errorResponse("오늘이야기 질문과 보조 문구를 모두 입력해 주세요.");
    }
    if (body.dailyPrompt.isActive !== false) {
      await db.prepare("UPDATE daily_prompts SET is_active = 0, updated_at = ?")
        .bind(now)
        .run();
    }
    await db.prepare(
      `INSERT INTO daily_prompts
      (id, question, helper_text, image_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        question = excluded.question,
        helper_text = excluded.helper_text,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
    )
      .bind(
        promptId,
        question,
        helperText,
        body.dailyPrompt.isActive === false ? 0 : 1,
        now,
        now,
      )
      .run();
  }

  if (Array.isArray(body.groups)) {
    for (let groupIndex = 0; groupIndex < body.groups.length; groupIndex += 1) {
      const group = body.groups[groupIndex];
      const typeId = normalizeId(group.typeId) || randomId("qt_");
      const typeTitle = group.typeTitle?.trim() ?? "";
      if (!typeTitle) return errorResponse("질문유형 제목을 입력해 주세요.");

      await db.prepare(
        `INSERT INTO question_types
        (id, title, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at`,
      )
        .bind(
          typeId,
          typeTitle,
          Number.isFinite(group.sortOrder) ? group.sortOrder : groupIndex,
          group.isActive === false ? 0 : 1,
          now,
          now,
        )
        .run();

      const questions = Array.isArray(group.questions) ? group.questions : [];
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
        const item = questions[questionIndex];
        const questionId = normalizeId(item.id) || randomId("q_");
        const category = item.category?.trim() ?? "";
        const question = item.question?.trim() ?? "";
        if (!category || !question) {
          return errorResponse("카테고리와 질문 문구를 모두 입력해 주세요.");
        }

        await db.prepare(
          `INSERT OR IGNORE INTO categories
          (key, name, icon, color, app_visible, created_at)
          VALUES (?, ?, 'circle', '#777777', 0, ?)`,
        )
          .bind(category, category, now)
          .run();

        await db.prepare(
          `INSERT INTO questions
          (id, type_id, category, question, sort_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            type_id = excluded.type_id,
            category = excluded.category,
            question = excluded.question,
            sort_order = excluded.sort_order,
            is_active = excluded.is_active,
            updated_at = excluded.updated_at`,
        )
          .bind(
            questionId,
            typeId,
            category,
            question,
            Number.isFinite(item.sortOrder) ? item.sortOrder : questionIndex,
            item.isActive === false ? 0 : 1,
            now,
            now,
          )
          .run();
      }
    }
  }

  return jsonResponse({ ok: true });
}

function normalizeId(value: string | undefined) {
  return value?.trim().replace(/[^A-Za-z0-9_-]/g, "") ?? "";
}

function normalizeColor(value: string | undefined) {
  return /^#[0-9a-f]{6}$/i.test(value?.trim() ?? "") ? value!.trim() : "#777777";
}
