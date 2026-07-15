import { ensureContentTables, type ContentImageRow } from "../../../_shared/content";
import { errorResponse, jsonResponse } from "../../../_shared/http";
import { ensureQuestionTables, requireAdmin } from "../../../_shared/questions";
import { getDb, type PagesContext } from "../../../_shared/types";

type Params = { id: string };

export async function onRequestDelete({ request, env, params }: PagesContext<Params>) {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  await ensureQuestionTables(db);
  await ensureContentTables(db);

  const image = await db.prepare(
    `SELECT id, scope, question_id, r2_key, description, version, created_at, is_active
    FROM content_images WHERE id = ?`,
  ).bind(params.id).first<ContentImageRow>();
  if (!image) return errorResponse("이미지를 찾을 수 없어요.", 404);

  await db.prepare("UPDATE content_images SET is_active = 0 WHERE id = ?")
    .bind(params.id)
    .run();
  if (image.scope === "daily") {
    await db.prepare("UPDATE daily_prompts SET image_id = NULL WHERE image_id = ?")
      .bind(params.id)
      .run();
  }

  return jsonResponse({ ok: true });
}
