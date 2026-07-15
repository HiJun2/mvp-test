import { ensureContentTables, toClientImage, type ContentImageRow } from "../../_shared/content";
import { randomId } from "../../_shared/crypto";
import { errorResponse, jsonResponse } from "../../_shared/http";
import { ensureQuestionTables, requireAdmin } from "../../_shared/questions";
import { getDb, type PagesContext } from "../../_shared/types";

type VersionRow = { max_version: number | null };
type QuestionExistsRow = { id: string };

export async function onRequestPost({ request, env }: PagesContext) {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);

  const form = await request.formData();
  const file = form.get("image");
  const scope = String(form.get("scope") ?? "");
  const questionId = optionalString(form.get("questionId"));
  const description = String(form.get("description") ?? "").trim();

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return errorResponse("이미지 파일을 선택해 주세요.");
  }
  if (file.size > 12 * 1024 * 1024) {
    return errorResponse("이미지는 12MB 이하로 올려 주세요.", 413);
  }
  if (scope !== "daily" && scope !== "breath_intro" && scope !== "question") {
    return errorResponse("이미지 용도가 올바르지 않아요.");
  }
  if (scope === "question" && !questionId) {
    return errorResponse("질문 이미지에는 질문 ID가 필요해요.");
  }

  await ensureQuestionTables(db);
  await ensureContentTables(db);
  if (questionId) {
    const question = await db.prepare("SELECT id FROM questions WHERE id = ?")
      .bind(questionId)
      .first<QuestionExistsRow>();
    if (!question) return errorResponse("연결할 질문을 찾을 수 없어요.", 404);
  }

  const versionQuery = questionId
    ? "SELECT MAX(version) AS max_version FROM content_images WHERE scope = ? AND question_id = ?"
    : "SELECT MAX(version) AS max_version FROM content_images WHERE scope = ? AND question_id IS NULL";
  const versionStatement = db.prepare(versionQuery);
  const versionRow = questionId
    ? await versionStatement.bind(scope, questionId).first<VersionRow>()
    : await versionStatement.bind(scope).first<VersionRow>();
  const version = (versionRow?.max_version ?? 0) + 1;
  const imageId = randomId("img_");
  const extension = imageExtension(file.type);
  const target = questionId ?? scope;
  const r2Key = `content-images/${scope}/${target}/${imageId}.${extension}`;
  const now = new Date().toISOString();

  await env.RECORDINGS.put(r2Key, file, {
    httpMetadata: { contentType: file.type || `image/${extension}` },
  });

  try {
    if (questionId) {
      await db.prepare(
        "UPDATE content_images SET is_active = 0 WHERE scope = ? AND question_id = ?",
      ).bind(scope, questionId).run();
    } else {
      await db.prepare(
        "UPDATE content_images SET is_active = 0 WHERE scope = ? AND question_id IS NULL",
      ).bind(scope).run();
    }

    await db.prepare(
      `INSERT INTO content_images
      (id, scope, question_id, r2_key, description, version, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
      .bind(imageId, scope, questionId, r2Key, description, version, now)
      .run();

    if (scope === "daily") {
      await db.prepare(
        "UPDATE daily_prompts SET image_id = ? WHERE is_active = 1",
      ).bind(imageId).run();
    }
  } catch (error) {
    await env.RECORDINGS.delete(r2Key);
    throw error;
  }

  const image: ContentImageRow = {
    id: imageId,
    scope,
    question_id: questionId,
    r2_key: r2Key,
    description,
    version,
    created_at: now,
    is_active: 1,
  };
  return jsonResponse({ image: toClientImage(image) }, { status: 201 });
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function imageExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("avif")) return "avif";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}
