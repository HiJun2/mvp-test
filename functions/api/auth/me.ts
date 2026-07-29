import {
  createSession,
  getCurrentUser,
  isAgeGroup,
  isGender,
} from "../../_shared/auth";
import { hashPassword, verifyPassword } from "../../_shared/crypto";
import { errorResponse, jsonResponse, readJson } from "../../_shared/http";
import { getDb, type PagesContext } from "../../_shared/types";

type ProfileBody = {
  name?: string;
  ageGroup?: string;
  gender?: string;
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
};

type PasswordRow = {
  password_hash: string;
  password_salt: string;
};

export async function onRequestGet({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);

  return jsonResponse({
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          ageGroup: user.age_group,
          gender: user.gender,
          createdAt: user.created_at,
        }
      : null,
  });
}

export async function onRequestPatch({ request, env }: PagesContext) {
  const user = await getCurrentUser(request, env);
  if (!user) return errorResponse("로그인이 필요해요.", 401);

  const db = getDb(env);
  if (!db) return errorResponse("D1 데이터베이스 연결이 필요해요.", 500);

  const body = await readJson<ProfileBody>(request);
  const name = body?.name?.trim() ?? "";
  const ageGroup = body?.ageGroup?.trim() ?? "";
  const gender = body?.gender?.trim() ?? "";
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  const newPasswordConfirm = body?.newPasswordConfirm ?? "";
  const changesPassword = Boolean(currentPassword || newPassword || newPasswordConfirm);

  if (name.length < 2) return errorResponse("이름은 2글자 이상 입력해 주세요.");
  if (!isAgeGroup(ageGroup)) return errorResponse("나이대를 선택해 주세요.");
  if (!isGender(gender)) return errorResponse("성별을 선택해 주세요.");

  let sessionCookie: string | null = null;
  if (changesPassword) {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return errorResponse("비밀번호를 변경하려면 세 항목을 모두 입력해 주세요.");
    }
    if (newPassword.length < 8) {
      return errorResponse("새 비밀번호는 8자 이상이어야 해요.");
    }
    if (newPassword !== newPasswordConfirm) {
      return errorResponse("새 비밀번호 확인이 일치하지 않아요.");
    }

    const password = await db.prepare(
      "SELECT password_hash, password_salt FROM users WHERE id = ?",
    ).bind(user.id).first<PasswordRow>();
    if (!password || !(await verifyPassword(currentPassword, password.password_salt, password.password_hash))) {
      return errorResponse("현재 비밀번호가 일치하지 않아요.", 401);
    }

    const { hash, salt } = await hashPassword(newPassword);
    await db.prepare(
      "UPDATE users SET name = ?, age_group = ?, gender = ?, password_hash = ?, password_salt = ? WHERE id = ?",
    ).bind(name, ageGroup, gender, hash, salt, user.id).run();

    await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
    sessionCookie = await createSession(env, user.id);
  } else {
    await db.prepare(
      "UPDATE users SET name = ?, age_group = ?, gender = ? WHERE id = ?",
    ).bind(name, ageGroup, gender, user.id).run();
  }

  return jsonResponse(
    {
      user: {
        id: user.id,
        name,
        email: user.email,
        ageGroup,
        gender,
        createdAt: user.created_at,
      },
    },
    sessionCookie ? { headers: { "set-cookie": sessionCookie } } : {},
  );
}
