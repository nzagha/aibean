import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { validPassword } from "./password-policy";
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
  if (!validPassword(password))
    throw new Error("Password does not meet the required policy.");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  if (
    password.length > 128 ||
    !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)
  )
    return false;
  const [, salt, hash] = stored.split(":");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export function passwordAccountId(email: string) {
  return `password_${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}
export const SESSION_SECONDS = 8 * 60 * 60;
export function signPasswordSession(
  accountId: string,
  secret: string,
  passwordHash: string,
  now = Date.now(),
) {
  if (secret.length < 64) throw new Error("Session secret is not configured.");
  const payload = Buffer.from(
    JSON.stringify({
      sub: accountId,
      exp: Math.floor(now / 1000) + SESSION_SECONDS,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${payload}:${passwordHash}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function verifyPasswordSession(
  token: string,
  accountId: string,
  secret: string,
  passwordHash: string,
  now = Date.now(),
) {
  if (secret.length < 64 || token.length > 1024) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || extra || !/^[A-Za-z0-9_-]{43}$/.test(signature || ""))
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${payload}:${passwordHash}`)
    .digest();
  const received = Buffer.from(signature, "base64url");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    return (
      data.sub === accountId &&
      Number.isInteger(data.exp) &&
      data.exp > seconds &&
      data.exp <= seconds + SESSION_SECONDS
    );
  } catch {
    return false;
  }
}
