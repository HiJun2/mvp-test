import { getCurrentUser } from "../../_shared/auth";
import {
  ensureContentTables,
  getActiveImage,
  type ContentImageRow,
} from "../../_shared/content";
import { randomId } from "../../_shared/crypto";
import { errorResponse, jsonResponse } from "../../_shared/http";
import { ensureQuestionTables } from "../../_shared/questions";
import { getDb, type D1Database, type PagesContext, type RecordRow } from "../../_shared/types";

type ExistingDailyRow = { id: string };

export async function onRequestGet({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);
  if (!user) return errorResponse("로그인이 필요해요.", 401);

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  await ensureRecordColumns(db);

  const { results } = await db.prepare(
    `SELECT
      id, user_id, type, question, question_id, question_type_index, question_index,
      category, question_type, question_type_title, duration_seconds, r2_key,
      mime_type, created_at, image_id, image_r2_key, image_version,
      image_description, local_date
    FROM records
    WHERE user_id = ?
    ORDER BY created_at DESC`,
  )
    .bind(user.id)
    .all<RecordRow>();

  return jsonResponse({ records: results.map(toClientRecord) });
}

export async function onRequestPost({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);
  if (!user) return errorResponse("로그인이 필요해요.", 401);

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  await ensureQuestionTables(db);
  await ensureContentTables(db);
  await ensureRecordColumns(db);

  const form = await request.formData();
  const audio = form.get("audio");
  const type = String(form.get("type") ?? "");
  const question = String(form.get("question") ?? "").trim();
  const questionId = optionalString(form.get("questionId"));
  const questionTypeIndex = optionalNumber(form.get("questionTypeIndex"));
  const questionIndex = optionalNumber(form.get("questionIndex"));
  const category = optionalString(form.get("category"));
  const questionType = optionalString(form.get("questionType"));
  const questionTypeTitle = optionalString(form.get("questionTypeTitle"));
  const requestedImageId = optionalString(form.get("imageId"));
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);
  const requestedCreatedAt = optionalString(form.get("createdAt"));
  const createdAt = isValidDate(requestedCreatedAt)
    ? new Date(requestedCreatedAt!).toISOString()
    : new Date().toISOString();

  if (!(audio instanceof File)) return errorResponse("음성 파일이 필요해요.");
  if (type !== "daily" && type !== "breath") {
    return errorResponse("기록 유형이 올바르지 않아요.");
  }
  if (!question) return errorResponse("질문 정보가 필요해요.");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return errorResponse("녹음 길이가 올바르지 않아요.");
  }
  if (durationSeconds > 600) return errorResponse("녹음은 최대 10분까지 저장할 수 있어요.");
  if (audio.size > 50 * 1024 * 1024) {
    return errorResponse("음성 파일은 50MB 이하만 저장할 수 있어요.", 413);
  }

  const localDate = type === "daily" ? getSeoulDateKey(new Date()) : null;
  if (localDate) {
    const { start, end } = getSeoulDayRange(localDate);
    const existing = await db.prepare(
      `SELECT id FROM records
      WHERE user_id = ? AND type = 'daily'
        AND (local_date = ? OR (local_date IS NULL AND created_at >= ? AND created_at < ?))
      LIMIT 1`,
    )
      .bind(user.id, localDate, start, end)
      .first<ExistingDailyRow>();
    if (existing) return errorResponse("오늘이야기는 하루에 한 번만 기록할 수 있어요.", 409);
  }

  const image = await resolveRecordImage(
    db,
    type,
    questionId,
    requestedImageId,
  );
  const recordId = randomId("rec_");
  const mimeType = audio.type || "audio/webm";
  const extension = audioExtension(mimeType);
  const r2Key = `recordings/users/${user.id}/${recordId}.${extension}`;

  await env.RECORDINGS.put(r2Key, audio, {
    httpMetadata: { contentType: mimeType },
  });

  try {
    await db.prepare(
      `INSERT INTO records (
        id, user_id, type, question, question_id, question_type_index, question_index,
        category, question_type, question_type_title, duration_seconds, r2_key,
        mime_type, created_at, image_id, image_r2_key, image_version,
        image_description, local_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        recordId,
        user.id,
        type,
        question,
        questionId,
        questionTypeIndex,
        questionIndex,
        category,
        questionType,
        questionTypeTitle,
        Math.min(600, Math.round(durationSeconds)),
        r2Key,
        mimeType,
        createdAt,
        image?.id ?? null,
        image?.r2_key ?? null,
        image?.version ?? null,
        image?.description ?? null,
        localDate,
      )
      .run();
  } catch {
    await env.RECORDINGS.delete(r2Key);
    return type === "daily"
      ? errorResponse("오늘이야기는 하루에 한 번만 기록할 수 있어요.", 409)
      : errorResponse("녹음을 저장하지 못했어요. 다시 시도해 주세요.", 500);
  }

  const record: RecordRow = {
    id: recordId,
    user_id: user.id,
    type,
    question,
    question_id: questionId,
    question_type_index: questionTypeIndex,
    question_index: questionIndex,
    category,
    question_type: questionType,
    question_type_title: questionTypeTitle,
    duration_seconds: Math.min(600, Math.round(durationSeconds)),
    r2_key: r2Key,
    mime_type: mimeType,
    created_at: createdAt,
    image_id: image?.id ?? null,
    image_r2_key: image?.r2_key ?? null,
    image_version: image?.version ?? null,
    image_description: image?.description ?? null,
    local_date: localDate,
  };
  return jsonResponse({ record: toClientRecord(record) }, { status: 201 });
}

async function resolveRecordImage(
  db: D1Database,
  type: "daily" | "breath",
  questionId: string | null,
  requestedImageId: string | null,
) {
  if (requestedImageId) {
    const requested = await db.prepare(
      `SELECT id, scope, question_id, r2_key, description, version, created_at, is_active
      FROM content_images WHERE id = ?`,
    ).bind(requestedImageId).first<ContentImageRow>();
    const validDaily = type === "daily" && requested?.scope === "daily";
    const validQuestion =
      type === "breath" &&
      requested?.scope === "question" &&
      requested.question_id === questionId;
    if (requested && (validDaily || validQuestion)) return requested;
  }
  return type === "daily"
    ? getActiveImage(db, "daily")
    : questionId
      ? getActiveImage(db, "question", questionId)
      : null;
}

async function ensureRecordColumns(db: D1Database) {
  const statements = [
    "ALTER TABLE records ADD COLUMN question_id TEXT",
    "ALTER TABLE records ADD COLUMN question_type_index INTEGER",
    "ALTER TABLE records ADD COLUMN question_index INTEGER",
    "ALTER TABLE records ADD COLUMN image_id TEXT",
    "ALTER TABLE records ADD COLUMN image_r2_key TEXT",
    "ALTER TABLE records ADD COLUMN image_version INTEGER",
    "ALTER TABLE records ADD COLUMN image_description TEXT",
    "ALTER TABLE records ADD COLUMN local_date TEXT",
  ];
  for (const statement of statements) {
    try {
      await db.prepare(statement).run();
    } catch {
      // Existing columns are intentionally reused.
    }
  }
  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_records_daily_date
    ON records(user_id, local_date)
    WHERE type = 'daily' AND local_date IS NOT NULL`,
  ).run();
}

function toClientRecord(record: RecordRow) {
  return {
    id: record.id,
    type: record.type,
    question: record.question,
    questionId: record.question_id ?? undefined,
    questionTypeIndex: record.question_type_index ?? undefined,
    questionIndex: record.question_index ?? undefined,
    category: record.category ?? undefined,
    questionType: record.question_type ?? undefined,
    questionTypeTitle: record.question_type_title ?? undefined,
    durationSeconds: record.duration_seconds,
    createdAt: record.created_at,
    localDate: record.local_date ?? undefined,
    imageId: record.image_id ?? undefined,
    imageVersion: record.image_version ?? undefined,
    imageDescription: record.image_description ?? undefined,
    imageUrl: record.image_id ? `/api/images/${record.image_id}` : undefined,
    audioUrl: `/api/records/${record.id}/audio`,
  };
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(typeof value === "string" ? value : "");
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue)
    : null;
}

function isValidDate(value: string | null) {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function audioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function getSeoulDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getSeoulDayRange(dateKey: string) {
  const startDate = new Date(`${dateKey}T00:00:00+09:00`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}
