import "server-only";
import { cookies } from "next/headers";
import { passwordAccountId, verifyPasswordSession } from "./password-crypto";
export const PASSWORD_COOKIE = "aibean_password_session";
export const passwordMode = () => process.env.AIBEAN_AUTH_MODE === "password";
export function passwordConfiguration() {
  if (!passwordMode()) return null;
  const email = process.env.LOCAL_LOGIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.LOCAL_LOGIN_PASSWORD_HASH;
  const secret = process.env.LOCAL_SESSION_SECRET;
  if (
    !email ||
    !hash ||
    !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash) ||
    !secret ||
    secret.length < 64
  )
    return null;
  return { email, hash, secret, accountId: passwordAccountId(email) };
}
export async function passwordIdentity() {
  const config = passwordConfiguration();
  if (!config) return null;
  const token = (await cookies()).get(PASSWORD_COOKIE)?.value;
  return token &&
    verifyPasswordSession(token, config.accountId, config.secret, config.hash)
    ? config.accountId
    : null;
}

// Single-process preview limiter, independent of forwarded IP headers. Failed
// attempts share a budget so changing email/IP cannot bypass it on this server.
const processState = globalThis as unknown as {
  passwordAttempts?: { count: number; expires: number };
};
export function allowPasswordAttempt(now = Date.now()) {
  if (
    !processState.passwordAttempts ||
    processState.passwordAttempts.expires <= now
  )
    processState.passwordAttempts = { count: 0, expires: now + 15 * 60_000 };
  const state = processState.passwordAttempts;
  if (state.count >= 10) return false;
  state.count++;
  return true;
}
