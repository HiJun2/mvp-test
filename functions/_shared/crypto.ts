const encoder = new TextEncoder();
const PASSWORD_HASH_PREFIX = "sha256:";

export function randomId(prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `${prefix}${base64Url(bytes)}`;
}

export function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function hashPassword(
  password: string,
  salt = randomId(),
) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}:${password}`),
  );
  return {
    salt,
    hash: `${PASSWORD_HASH_PREFIX}${base64Url(new Uint8Array(digest))}`,
  };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
) {
  const { hash } = await hashPassword(password, salt);
  if (timingSafeEqual(hash, expectedHash)) {
    return true;
  }

  if (!expectedHash.startsWith(PASSWORD_HASH_PREFIX)) {
    return timingSafeEqual(hash.slice(PASSWORD_HASH_PREFIX.length), expectedHash);
  }

  return false;
}

export async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(new Uint8Array(signature));
}

export async function verifySignature(
  value: string,
  signature: string,
  secret: string,
) {
  const expectedSignature = await sign(value, secret);
  return timingSafeEqual(signature, expectedSignature);
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    result |= leftBytes[index] ^ rightBytes[index];
  }
  return result === 0;
}
