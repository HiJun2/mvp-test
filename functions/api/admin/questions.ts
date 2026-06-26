import { randomId } from "../../_shared/crypto";
import { errorResponse, jsonResponse, readJson } from "../../_shared/http";
import {
  ensureQuestionTables,
  requireAdmin,
  type QuestionRow,
  type QuestionTypeRow,
} from "../../_shared/questions";
import { getDb, type PagesContext } from "../../_shared/types";

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
};

export async function onRequestGet({ request, env }: PagesContext) {
  const adminError = requireAdmin(request, env);
  if (adminError) {
    return adminError;
  }

  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  await ensureQuestionTables(db);

  const [{ results: typeRows }, { results: questionRows }] = await Promise.all([
    db.prepare(
      "SELECT id, title, sort_order, is_active FROM question_types ORDER BY sort_order, created_at",
    ).all<QuestionTypeRow>(),
    db.prepare(
      "SELECT id, type_id, category, question, sort_order, is_active FROM questions ORDER BY sort_order, created_at",
    ).all<QuestionRow>(),
  ]);

  return jsonResponse({
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
        })),
    })),
  });
}

export async function onRequestPost({ request, env }: PagesContext) {
  const adminError = requireAdmin(request, env);
  if (adminError) {
    return adminError;
  }

  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  const body = await readJson<SaveBody>(request);
  if (!Array.isArray(body?.groups)) {
    return errorResponse("저장할 질문 데이터가 필요해요.");
  }

  await ensureQuestionTables(db);
  const now = new Date().toISOString();

  for (let groupIndex = 0; groupIndex < body.groups.length; groupIndex += 1) {
    const group = body.groups[groupIndex];
    const typeId = normalizeId(group.typeId) || randomId("qt_");
    const typeTitle = group.typeTitle?.trim() ?? "";

    if (!typeTitle) {
      return errorResponse("질문유형 제목을 입력해 주세요.");
    }

    await db.prepare(
      `INSERT INTO question_types (
        id, title, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
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
        `INSERT INTO questions (
          id, type_id, category, question, sort_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

  return jsonResponse({ ok: true });
}

function normalizeId(value: string | undefined) {
  return value?.trim().replace(/[^A-Za-z0-9_-]/g, "") ?? "";
}
