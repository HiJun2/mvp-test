import { jsonResponse } from "../_shared/http";
import { ensureQuestionTables, type PublicQuestionRow } from "../_shared/questions";
import { getDb, type PagesContext } from "../_shared/types";

export async function onRequestGet({ env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return jsonResponse({ questions: [] });
  }

  try {
    await ensureQuestionTables(db);
    const { results } = await db.prepare(
      `SELECT
        questions.id,
        questions.type_id,
        question_types.title AS type_title,
        question_types.sort_order AS type_sort_order,
        questions.category,
        questions.question,
        questions.sort_order,
        questions.is_active
      FROM questions
      INNER JOIN question_types ON question_types.id = questions.type_id
      WHERE questions.is_active = 1 AND question_types.is_active = 1
      ORDER BY question_types.sort_order, questions.sort_order, questions.created_at`,
    ).all<PublicQuestionRow>();

    return jsonResponse({
      questions: results.map((row) => ({
        id: row.id,
        typeId: row.type_id,
        typeTitle: row.type_title,
        typeIndex: row.type_sort_order + 1,
        questionIndex: row.sort_order + 1,
        category: row.category,
        question: row.question,
      })),
    });
  } catch {
    return jsonResponse({ questions: [] });
  }
}
