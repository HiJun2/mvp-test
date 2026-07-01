import { jsonResponse } from "../_shared/http";
import { DEFAULT_BREATH_GOAL, getBreathGoal } from "../_shared/questions";
import { getDb, type PagesContext } from "../_shared/types";

export async function onRequestGet({ env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return jsonResponse({ breathGoal: DEFAULT_BREATH_GOAL });
  }

  try {
    return jsonResponse({ breathGoal: await getBreathGoal(db) });
  } catch {
    return jsonResponse({ breathGoal: DEFAULT_BREATH_GOAL });
  }
}
