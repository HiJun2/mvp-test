import { getCurrentUser } from "../../_shared/auth";
import { randomId } from "../../_shared/crypto";
import { errorResponse, jsonResponse } from "../../_shared/http";
import { getDb, type PagesContext, type RecordRow } from "../../_shared/types";

export async function onRequestGet({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return errorResponse("로그인이 필요해요.", 401);
  }
  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  const { results } = await db.prepare(
    "SELECT id, user_id, type, question, category, question_type, question_type_title, duration_seconds, r2_key, mime_type, created_at FROM records WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(user.id)
    .all<RecordRow>();

  return jsonResponse({
    records: results.map(toClientRecord),
  });
}

export async function onRequestPost({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return errorResponse("로그인이 필요해요.", 401);
  }
  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const type = String(form.get("type") ?? "");
  const question = String(form.get("question") ?? "").trim();
  const category = optionalString(form.get("category"));
  const questionType = optionalString(form.get("questionType"));
  const questionTypeTitle = optionalString(form.get("questionTypeTitle"));
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);
  const createdAt = optionalString(form.get("createdAt")) ?? new Date().toISOString();

  if (!(audio instanceof File)) {
    return errorResponse("음성파일이 필요해요.");
  }
  if (type !== "daily" && type !== "breath") {
    return errorResponse("기록 유형이 올바르지 않아요.");
  }
  if (!question) {
    return errorResponse("질문 정보가 필요해요.");
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return errorResponse("녹음 길이가 올바르지 않아요.");
  }
  if (audio.size > 50 * 1024 * 1024) {
    return errorResponse("음성파일은 50MB 이하만 저장할 수 있어요.", 413);
  }

  const recordId = randomId("rec_");
  const mimeType = audio.type || "audio/webm";
  const extension = mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("mpeg")
      ? "mp3"
      : "webm";
  const r2Key = `users/${user.id}/records/${recordId}.${extension}`;

  await env.RECORDINGS.put(r2Key, audio, {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  await db.prepare(
    `INSERT INTO records (
      id, user_id, type, question, category, question_type, question_type_title,
      duration_seconds, r2_key, mime_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      recordId,
      user.id,
      type,
      question,
      category,
      questionType,
      questionTypeTitle,
      Math.round(durationSeconds),
      r2Key,
      mimeType,
      createdAt,
    )
    .run();

  return jsonResponse(
    {
      record: {
        id: recordId,
        type,
        question,
        category,
        questionType,
        questionTypeTitle,
        durationSeconds: Math.round(durationSeconds),
        createdAt,
        audioUrl: `/api/records/${recordId}/audio`,
      },
    },
    { status: 201 },
  );
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function toClientRecord(record: RecordRow) {
  return {
    id: record.id,
    type: record.type,
    question: record.question,
    category: record.category ?? undefined,
    questionType: record.question_type ?? undefined,
    questionTypeTitle: record.question_type_title ?? undefined,
    durationSeconds: record.duration_seconds,
    createdAt: record.created_at,
    audioUrl: `/api/records/${record.id}/audio`,
  };
}
