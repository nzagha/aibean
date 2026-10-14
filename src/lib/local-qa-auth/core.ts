import { randomBytes, randomUUID, createHash } from "node:crypto";
import type postgres from "postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { ordinaryUserInsert } from "../db/ordinary-user";
import { hashPassword, verifyPassword } from "../password-crypto";
import { validPassword } from "../password-policy";
import { z } from "zod";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("hex");
export const ACCESS_COOKIE = "aibean_password_session";
export const RECOVERY_COOKIE = "aibean_local_qa_recovery";
export const MAILBOX_COOKIE = "aibean_local_qa_mailbox";
export function emailInput(value: string) {
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !z.email().safeParse(email).success ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.invalid$/.test(email)
  )
    throw Error("email");
  return email;
}
export function passwordInput(password: string, confirm: string) {
  if (!validPassword(password)) throw Error("password");
  if (password !== confirm) throw Error("confirmation");
}
export class QaRateError extends Error {}
export function createQaAuth(pg: postgres.Sql, dummyHash: string) {
  async function audit(
    tx: postgres.TransactionSql,
    userId: string,
    action: string,
  ) {
    await tx`INSERT INTO public.audit_logs(id,actor_id,action,entity_id,detail) VALUES(${randomUUID()},${userId},${"local-qa." + action},${userId},'{"scope":"local-only","credentialsIncluded":false}')`;
  }
  async function withHandoffLock(work: () => void) {
    await pg.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended('local-qa-private-handoff',0))`;
      work();
    });
  }
  async function limit(operation: string, email: string, max = 10) {
    const key = operation + ":" + digest(email);
    const [row] = await pg`
      INSERT INTO local_qa_auth.rates(key,count,expires_at) VALUES(${key},1,now()+interval '15 minutes')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rates.expires_at<=now() THEN 1 ELSE rates.count+1 END,
      expires_at=CASE WHEN rates.expires_at<=now() THEN now()+interval '15 minutes' ELSE rates.expires_at END
      RETURNING count`;
    if (row.count > max) throw new QaRateError("rate");
  }
  async function deliver(
    tx: postgres.TransactionSql,
    userId: string,
    email: string,
    purpose: "verify" | "reset",
  ) {
    const token = randomToken();
    await tx`INSERT INTO local_qa_auth.tokens(digest,user_id,purpose,expires_at) VALUES(${digest(token)},${userId},${purpose},now()+interval '15 minutes')`;
    await tx`INSERT INTO local_qa_auth.mail(id,email,purpose,token) VALUES(${randomUUID()},${email},${purpose},${token})`;
  }
  async function register(email: string, password: string) {
    await limit("register-global", "all", 60);
    await limit("register", email, 5);
    const hash = await hashPassword(password);
    await pg.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"qa-register:" + email},0))`;
      const existing =
        await tx`SELECT user_id FROM local_qa_auth.accounts WHERE email=${email}`;
      if (existing.length) return;
      const userId = "local_qa_" + randomUUID();
      const insertion = new PgDialect().sqlToQuery(ordinaryUserInsert(userId));
      await tx.unsafe(insertion.sql, insertion.params as string[]);
      await tx`INSERT INTO local_qa_auth.accounts(user_id,email,password_hash) VALUES(${userId},${email},${hash})`;
      await deliver(tx, userId, email, "verify");
      await audit(tx, userId, "registered");
    });
  }
  async function login(email: string, password: string) {
    await limit("login-global", "all", 200);
    await limit("login", email, 10);
    const [account] =
      await pg`SELECT user_id,password_hash,confirmed FROM local_qa_auth.accounts WHERE email=${email}`;
    const matches = await verifyPassword(
      password,
      account?.password_hash || dummyHash,
    );
    if (!matches || !account?.confirmed) return null;
    return pg.begin(async (tx) => {
      const [locked] =
        await tx`SELECT password_hash,confirmed FROM local_qa_auth.accounts WHERE user_id=${account.user_id} FOR UPDATE`;
      if (!locked.confirmed || locked.password_hash !== account.password_hash)
        return null;
      const token = randomToken();
      await tx`INSERT INTO local_qa_auth.sessions(digest,user_id,purpose,expires_at) VALUES(${digest(token)},${account.user_id},'access',now()+interval '8 hours')`;
      return token;
    });
  }
  async function identity(token: string | undefined, purpose = "access") {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const [session] = await pg`
      SELECT s.user_id FROM local_qa_auth.sessions s
      JOIN local_qa_auth.accounts a ON a.user_id=s.user_id
      WHERE s.digest=${digest(token)} AND s.purpose=${purpose} AND NOT s.revoked AND s.expires_at>now() AND a.confirmed`;
    return (session?.user_id as string) || null;
  }
  async function logout(token: string | undefined) {
    if (token)
      await pg`UPDATE local_qa_auth.sessions SET revoked=true WHERE digest=${digest(token)}`;
  }
  async function forgot(email: string) {
    await limit("forgot-global", "all", 80);
    await limit("forgot", email, 5);
    await pg.begin(async (tx) => {
      const [account] =
        await tx`SELECT user_id,confirmed FROM local_qa_auth.accounts WHERE email=${email} FOR UPDATE`;
      if (account?.confirmed)
        await deliver(tx, account.user_id, email, "reset");
    });
  }
  async function exchange(token: string, purpose: string) {
    await limit("exchange-global", "all", 200);
    if (!/^[a-f0-9]{64}$/.test(token) || !["verify", "reset"].includes(purpose))
      return null;
    return pg.begin(async (tx) => {
      const [candidate] = await tx`SELECT user_id FROM local_qa_auth.tokens
        WHERE digest=${digest(token)} AND purpose=${purpose} AND NOT consumed AND expires_at>now()`;
      if (!candidate) return null;
      // Serialize token exchange with password replacement; a recovery session
      // must not appear after that replacement has revoked the old tokens.
      await tx`SELECT user_id FROM local_qa_auth.accounts WHERE user_id=${candidate.user_id} FOR UPDATE`;
      const [consumed] = await tx`
        UPDATE local_qa_auth.tokens SET consumed=true WHERE digest=${digest(token)} AND purpose=${purpose}
        AND NOT consumed AND expires_at>now() RETURNING user_id`;
      if (!consumed) return null;
      if (purpose === "verify") {
        await tx`UPDATE local_qa_auth.accounts SET confirmed=true WHERE user_id=${consumed.user_id}`;
        await audit(tx, consumed.user_id, "email-confirmed");
        return "verified";
      }
      const session = randomToken();
      await tx`INSERT INTO local_qa_auth.sessions(digest,user_id,purpose,expires_at) VALUES(${digest(session)},${consumed.user_id},'recovery',now()+interval '15 minutes')`;
      return session;
    });
  }
  async function change(token: string, current: string, password: string) {
    const userId = await identity(token);
    if (!userId) return false;
    await limit("change", userId, 10);
    const hash = await hashPassword(password);
    return pg.begin(async (tx) => {
      const [account] =
        await tx`SELECT password_hash FROM local_qa_auth.accounts WHERE user_id=${userId} FOR UPDATE`;
      if (!(await verifyPassword(current, account.password_hash))) return false;
      // Recheck the session under the same transaction to prevent revoke races.
      const sessions =
        await tx`SELECT digest FROM local_qa_auth.sessions WHERE digest=${digest(token)} AND NOT revoked AND expires_at>now() AND purpose='access' FOR UPDATE`;
      if (!sessions.length) return false;
      await tx`UPDATE local_qa_auth.accounts SET password_hash=${hash} WHERE user_id=${userId}`;
      await tx`UPDATE local_qa_auth.sessions SET revoked=true WHERE user_id=${userId}`;
      await tx`UPDATE local_qa_auth.tokens SET consumed=true WHERE user_id=${userId}`;
      await audit(tx, userId, "password-changed");
      return true;
    });
  }
  async function reset(token: string, password: string) {
    const hash = await hashPassword(password);
    return pg.begin(async (tx) => {
      const [candidate] =
        await tx`SELECT user_id FROM local_qa_auth.sessions WHERE digest=${digest(token)} AND purpose='recovery' AND NOT revoked AND expires_at>now()`;
      if (!candidate) return false;
      await tx`SELECT user_id FROM local_qa_auth.accounts WHERE user_id=${candidate.user_id} FOR UPDATE`;
      const [session] =
        await tx`SELECT user_id FROM local_qa_auth.sessions WHERE digest=${digest(token)} AND purpose='recovery' AND NOT revoked AND expires_at>now() FOR UPDATE`;
      if (!session) return false;
      await tx`UPDATE local_qa_auth.accounts SET password_hash=${hash} WHERE user_id=${session.user_id}`;
      await tx`UPDATE local_qa_auth.sessions SET revoked=true WHERE user_id=${session.user_id}`;
      await tx`UPDATE local_qa_auth.tokens SET consumed=true WHERE user_id=${session.user_id}`;
      await audit(tx, session.user_id, "password-reset");
      return true;
    });
  }
  async function mailboxLogin(password: string, hash: string) {
    await limit("mailbox", "owner", 10);
    if (!(await verifyPassword(password, hash))) return null;
    const token = randomToken();
    await pg`INSERT INTO local_qa_auth.sessions(digest,purpose,expires_at) VALUES(${digest(token)},'mailbox',now()+interval '8 hours')`;
    return token;
  }
  async function mailboxAllowed(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
    const rows =
      await pg`SELECT digest FROM local_qa_auth.sessions WHERE digest=${digest(token)} AND purpose='mailbox' AND NOT revoked AND expires_at>now()`;
    return rows.length === 1;
  }
  return {
    withHandoffLock,
    limit,
    register,
    login,
    identity,
    logout,
    forgot,
    exchange,
    change,
    reset,
    mailboxLogin,
    mailboxAllowed,
    mail: () =>
      pg`SELECT id,email,purpose,token,created_at FROM local_qa_auth.mail ORDER BY created_at DESC LIMIT 30`,
  };
}
