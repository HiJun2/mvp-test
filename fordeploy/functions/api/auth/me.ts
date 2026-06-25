import { getCurrentUser } from "../../_shared/auth";
import { jsonResponse } from "../../_shared/http";
import type { PagesContext } from "../../_shared/types";

export async function onRequestGet({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);

  return jsonResponse({
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        }
      : null,
  });
}
