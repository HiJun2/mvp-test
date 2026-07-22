import { jsonResponse } from "../_shared/http";
import { ensureContentTables, VISIBLE_CATEGORY_ORDER } from "../_shared/content";
import { ensureQuestionTables, type PublicQuestionRow } from "../_shared/questions";
import { getDb, type PagesContext } from "../_shared/types";

export async function onRequestGet({ env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return jsonResponse({ questions: [] });
  }

  try {
    await ensureQuestionTables(db);
    await ensureContentTables(db);
    const { results } = await db.prepare(
      `SELECT
        questions.id,
        questions.type_id,
        question_types.title AS type_title,
        question_types.sort_order AS type_sort_order,
        questions.category,
        questions.question,
        questions.helper_text,
        questions.sort_order,
        questions.is_active,
        categories.key AS category_key,
        categories.icon AS category_icon,
        categories.color AS category_color,
        content_images.id AS image_id,
        content_images.description AS image_description,
        content_images.version AS image_version
      FROM questions
      INNER JOIN question_types ON question_types.id = questions.type_id
      INNER JOIN categories ON categories.name = questions.category
      LEFT JOIN content_images ON content_images.id = (
        SELECT image.id
        FROM content_images AS image
        WHERE image.scope = 'question'
          AND image.question_id = questions.id
          AND image.is_active = 1
        ORDER BY image.version DESC
        LIMIT 1
      )
      WHERE questions.is_active = 1
        AND question_types.is_active = 1
        AND categories.app_visible = 1
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
        categoryKey: row.category_key,
        categoryIcon: row.category_icon,
        categoryColor: row.category_color,
        question: row.question,
        helperText: row.helper_text,
        image: row.image_id
          ? {
              id: row.image_id,
              description: row.image_description ?? "",
              version: row.image_version ?? 1,
              imageUrl: `/api/images/${row.image_id}`,
            }
          : null,
      })),
      categoryOrder: VISIBLE_CATEGORY_ORDER,
    });
  } catch {
    return jsonResponse({ questions: [] });
  }
}
