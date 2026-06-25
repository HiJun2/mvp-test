import { clearSessionCookie, deleteCurrentSession } from "../../_shared/auth";
import { jsonResponse } from "../../_shared/http";
import type { PagesContext } from "../../_shared/types";

export async function onRequestPost({ request, env }: PagesContext) {
  await deleteCurrentSession(request, env);

  return jsonResponse(
    {
      ok: true,
    },
    {
      headers: {
        "set-cookie": clearSessionCookie(),
      },
    },
  );
}
