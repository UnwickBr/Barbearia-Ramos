import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not configured.");
}

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number;
};

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
};

const sign = (value: string) => createHmac("sha256", sessionSecret).update(value).digest();

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const comparisonHash = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, "hex");

  if (comparisonHash.length !== originalBuffer.length) {
    return false;
  }

  return timingSafeEqual(comparisonHash, originalBuffer);
};

export const buildAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=c8922a&color=fff&bold=true`;

export const createSessionToken = (payload: Omit<SessionPayload, "exp">, maxAgeSeconds = 60 * 60 * 24 * 7) => {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode(sign(encodedPayload));
  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token?: string | null): SessionPayload | null => {
  if (!token) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const receivedSignature = Buffer.from(
    encodedSignature.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encodedSignature.length % 4)) % 4),
    "base64",
  );

  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};
