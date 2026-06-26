import { createCookie, getCookie } from "./http";
import { randomId, sign, verifySignature } from "./crypto";
import { getDb, type Env, type User } from "./types";

export const SESSION_COOKIE = "breath_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
};

export async function createSession(env: Env, userId: string) {
  const db = getDb(env);
  if (!db) {
    throw new Error("D1 binding is missing.");
  }

  const sessionId = randomId("sess_");
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();

  await db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(sessionId, userId, expiresAt, new Date().toISOString())
    .run();

  const signature = await sign(sessionId, env.SESSION_SECRET);
  const cookieValue = `${sessionId}.${signature}`;
  return createCookie(SESSION_COOKIE, cookieValue, {
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  return createCookie(SESSION_COOKIE, "", {
    maxAge: 0,
  });
}

export async function getCurrentUser(request: Request, env: Env) {
  const db = getDb(env);
  if (!db) {
    return null;
  }

  const cookieValue = getCookie(request, SESSION_COOKIE);
  const [sessionId, signature] = cookieValue.split(".");

  if (!sessionId || !signature) {
    return null;
  }

  const validSignature = await verifySignature(
    sessionId,
    signature,
    env.SESSION_SECRET,
  );
  if (!validSignature) {
    return null;
  }

  const session = await db.prepare(
    "SELECT id, user_id, expires_at FROM sessions WHERE id = ?",
  )
    .bind(sessionId)
    .first<SessionRow>();

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return db.prepare(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
  )
    .bind(session.user_id)
    .first<User>();
}

export async function deleteCurrentSession(request: Request, env: Env) {
  const db = getDb(env);
  if (!db) {
    return;
  }

  const cookieValue = getCookie(request, SESSION_COOKIE);
  const [sessionId] = cookieValue.split(".");

  if (sessionId) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
}
