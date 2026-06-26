import { createSession } from "../../_shared/auth";
import { hashPassword, randomId } from "../../_shared/crypto";
import { errorResponse, isEmail, jsonResponse, readJson } from "../../_shared/http";
import { getDb, type PagesContext } from "../../_shared/types";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
};

type ExistingUser = {
  id: string;
};

export async function onRequestPost({ request, env }: PagesContext) {
  const db = getDb(env);
  if (!db) {
    return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);
  }

  const body = await readJson<SignupBody>(request);
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (name.length < 2) {
    return errorResponse("이름을 2글자 이상 입력해 주세요.");
  }
  if (!isEmail(email)) {
    return errorResponse("이메일 형식의 아이디를 입력해 주세요.");
  }
  if (password.length < 8) {
    return errorResponse("비밀번호는 8자 이상이어야 해요.");
  }

  let stage = "checking-existing-user";

  try {
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<ExistingUser>();

    if (existingUser) {
      return errorResponse("이미 가입된 이메일이에요.", 409);
    }

    stage = "hashing-password";
    const userId = randomId("user_");
    const { hash, salt } = await hashPassword(password);
    const createdAt = new Date().toISOString();

    stage = "creating-user";
    await db.prepare(
      "INSERT INTO users (id, name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(userId, name, email, hash, salt, createdAt)
      .run();

    stage = "creating-session";
    const sessionCookie = await createSession(env, userId);

    return jsonResponse(
      {
        user: {
          id: userId,
          name,
          email,
          createdAt,
        },
      },
      {
        status: 201,
        headers: {
          "set-cookie": sessionCookie,
        },
      },
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "회원가입 요청을 처리하지 못했어요.",
        stage,
      },
      { status: 500 },
    );
  }
}
