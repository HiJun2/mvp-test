import { getCurrentUser } from "../../../_shared/auth";
import { errorResponse } from "../../../_shared/http";
import { getDb, type PagesContext } from "../../../_shared/types";

type Params = {
  id: string;
};

type RecordFile = {
  r2_key: string;
  mime_type: string;
};

export async function onRequestGet({
  request,
  env,
  params,
}: PagesContext<Params>) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return errorResponse("로그인이 필요해요.", 401);
  }
  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  const record = await db.prepare(
    "SELECT r2_key, mime_type FROM records WHERE id = ? AND user_id = ?",
  )
    .bind(params.id, user.id)
    .first<RecordFile>();

  if (!record) {
    return errorResponse("기록을 찾을 수 없어요.", 404);
  }

  const rangeHeader = request.headers.get("range");
  const fullObject = await env.RECORDINGS.get(record.r2_key);

  if (!fullObject) {
    return errorResponse("음성파일을 찾을 수 없어요.", 404);
  }

  const range = rangeHeader ? parseRange(rangeHeader, fullObject.size) : null;
  const object = range
    ? await env.RECORDINGS.get(record.r2_key, { range })
    : fullObject;

  if (!object) {
    return errorResponse("음성파일을 찾을 수 없어요.", 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.mime_type);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=0");

  if (range) {
    headers.set(
      "content-range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${fullObject.size}`,
    );
    headers.set("content-length", String(range.length));
    return new Response(object.body, {
      status: 206,
      headers,
    });
  }

  headers.set("content-length", String(fullObject.size));
  return new Response(object.body, {
    headers,
  });
}

function parseRange(rangeHeader: string, size: number) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    return null;
  }
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(offset) || !Number.isFinite(end) || offset > end) {
    return null;
  }
  return {
    offset,
    length: Math.min(end, size - 1) - offset + 1,
  };
}
