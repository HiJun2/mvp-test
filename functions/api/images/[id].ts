import { ensureContentTables, type ContentImageRow } from "../../_shared/content";
import { errorResponse } from "../../_shared/http";
import { ensureQuestionTables } from "../../_shared/questions";
import { getDb, type PagesContext } from "../../_shared/types";

type Params = { id: string };

export async function onRequestGet({ env, params }: PagesContext<Params>) {
  const db = getDb(env);
  if (!db) {
    return errorResponse("이미지 저장소에 연결할 수 없어요.", 500);
  }

  await ensureQuestionTables(db);
  await ensureContentTables(db);
  const image = await db.prepare(
    `SELECT id, scope, question_id, r2_key, description, version, created_at, is_active
    FROM content_images WHERE id = ?`,
  )
    .bind(params.id)
    .first<ContentImageRow>();
  if (!image) {
    return errorResponse("이미지를 찾을 수 없어요.", 404);
  }

  const object = await env.RECORDINGS.get(image.r2_key);
  if (!object) {
    return errorResponse("R2에서 이미지를 찾을 수 없어요.", 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-length", String(object.size));
  return new Response(object.body, { headers });
}
