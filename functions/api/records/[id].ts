import { getCurrentUser } from "../../_shared/auth";
import { errorResponse, jsonResponse } from "../../_shared/http";
import type { PagesContext } from "../../_shared/types";

type Params = {
  id: string;
};

type RecordKey = {
  r2_key: string;
};

export async function onRequestDelete({
  request,
  env,
  params,
}: PagesContext<Params>) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return errorResponse("로그인이 필요해요.", 401);
  }

  const record = await env.DB.prepare(
    "SELECT r2_key FROM records WHERE id = ? AND user_id = ?",
  )
    .bind(params.id, user.id)
    .first<RecordKey>();

  if (!record) {
    return errorResponse("기록을 찾을 수 없어요.", 404);
  }

  await env.RECORDINGS.delete(record.r2_key);
  await env.DB.prepare("DELETE FROM records WHERE id = ? AND user_id = ?")
    .bind(params.id, user.id)
    .run();

  return jsonResponse({ ok: true });
}
