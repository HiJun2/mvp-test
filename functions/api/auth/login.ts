import { createSession, ensureUserProfileColumns } from "../../_shared/auth";
import { verifyPassword } from "../../_shared/crypto";
import { errorResponse, isEmail, jsonResponse, readJson } from "../../_shared/http";
import { getDb, type PagesContext } from "../../_shared/types";
import type { AgeGroup, Gender } from "../../_shared/types";

type LoginBody = {
  email?: string;
  password?: string;
};

type UserWithPassword = {
  id: string;
  name: string;
  email: string;
  age_group: AgeGroup;
  gender: Gender;
  password_hash: string;
  password_salt: string;
  created_at: string;
};

export async function onRequestPost({ request, env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }
  await ensureUserProfileColumns(db);

  const body = await readJson<LoginBody>(request);
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!isEmail(email) || !password) {
    return errorResponse("이메일과 비밀번호를 확인해 주세요.");
  }

  const user = await db.prepare(
    "SELECT id, name, email, age_group, gender, password_hash, password_salt, created_at FROM users WHERE email = ?",
  )
    .bind(email)
    .first<UserWithPassword>();

  if (!user) {
    return errorResponse("이메일 또는 비밀번호가 맞지 않아요.", 401);
  }

  const validPassword = await verifyPassword(
    password,
    user.password_salt,
    user.password_hash,
  );

  if (!validPassword) {
    return errorResponse("이메일 또는 비밀번호가 맞지 않아요.", 401);
  }

  const sessionCookie = await createSession(env, user.id);

  return jsonResponse(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ageGroup: user.age_group,
        gender: user.gender,
        createdAt: user.created_at,
      },
    },
    {
      headers: {
        "set-cookie": sessionCookie,
      },
    },
  );
}
