import {
  ensureContentTables,
  getActiveImage,
  toClientImage,
  type DailyPromptRow,
} from "../_shared/content";
import { jsonResponse } from "../_shared/http";
import { ensureQuestionTables } from "../_shared/questions";
import { getDb, type PagesContext } from "../_shared/types";

const fallback = {
  dailyPrompt: {
    id: "daily_default",
    question: "지금 날씨는 어때?",
    helperText: "밖의 날씨를 보며 오늘의 기분을 이야기해 주세요.",
    isActive: true,
    image: null,
  },
  breathIntroImage: null,
};

export async function onRequestGet({ env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return jsonResponse(fallback);
  }

  try {
    await ensureQuestionTables(db);
    await ensureContentTables(db);
    const [dailyPrompt, dailyImage, breathIntroImage] = await Promise.all([
      db.prepare(
        `SELECT id, question, helper_text, image_id, is_active
        FROM daily_prompts
        ORDER BY is_active DESC, updated_at DESC, created_at DESC
        LIMIT 1`,
      ).first<DailyPromptRow>(),
      getActiveImage(db, "daily"),
      getActiveImage(db, "breath_intro"),
    ]);

    return jsonResponse({
      dailyPrompt: dailyPrompt
        ? {
            id: dailyPrompt.id,
            question: dailyPrompt.question,
            helperText: dailyPrompt.helper_text,
            isActive: Boolean(dailyPrompt.is_active),
            image: toClientImage(dailyImage),
          }
        : fallback.dailyPrompt,
      breathIntroImage: toClientImage(breathIntroImage),
    });
  } catch {
    return jsonResponse(fallback);
  }
}
