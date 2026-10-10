import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "../catalog/filter";
import { validPassword } from "../password-policy";
import { SUPABASE_PROJECT_REF } from "./config";
import { verifiedSupabaseAccount } from "./identity";
import {
  createAuthProofs,
  createProofReplayStore,
  INTENT_COOKIE,
  RECOVERY_COOKIE,
  ACCESS_COOKIE,
} from "./auth-proof";
import { clearSupabaseSessionCookies } from "./session-refresh";

export type AuthAction =
  "login" | "register" | "resend" | "recover" | "reset" | "logout";
type AuthClient = Pick<
  SupabaseClient["auth"],
  | "signUp"
  | "signInWithPassword"
  | "resend"
  | "resetPasswordForEmail"
  | "updateUser"
  | "signOut"
  | "getClaims"
  | "getUser"
  | "exchangeCodeForSession"
  | "verifyOtp"
>;
export type AuthDependencies = {
  origin: string;
  secret: string;
  client: (request: NextRequest) => {
    auth: AuthClient;
    finish: (response: NextResponse) => NextResponse;
  };
  provision: (uuid: string) => Promise<unknown>;
  allow: (purpose: string, email: string) => boolean;
  replay: ReturnType<typeof createProofReplayStore>;
};

// This controller is shared by real routes and injected mock tests. The real
// wrapper must check release/provider authorization before constructing it.
export function createAuthHandlers(deps: AuthDependencies) {
  const origin = new URL(deps.origin).origin;
  function requestMatchesOrigin(request: NextRequest) {
    const actual = new URL(request.url);
    const configured = new URL(origin);
    if (actual.origin === origin) return true;
    // NextURL normalizes loopback IPs to localhost. Only that framework
    // normalization is accepted; POST still requires the exact Origin header.
    return (
      actual.hostname === "localhost" &&
      ["127.0.0.1", "[::1]"].includes(configured.hostname) &&
      actual.protocol === configured.protocol &&
      actual.port === configured.port
    );
  }
  const proofs = createAuthProofs(deps.secret);
  const secure = origin.startsWith("https:");
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  function redirect(path: string, values: Record<string, string> = {}) {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(values))
      url.searchParams.set(key, value);
    const response = NextResponse.redirect(url, 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  function clear(response: NextResponse, name: string) {
    response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
  function verifierHash(request: NextRequest) {
    const cookies = request.cookies
      .getAll()
      .filter(
        (c) =>
          c.name.startsWith(`sb-${SUPABASE_PROJECT_REF}-`) &&
          /-code-verifier(?:\.\d+)?$/.test(c.name),
      );
    if (!cookies.length) return null;
    return createHash("sha256")
      .update(
        JSON.stringify(cookies.sort((a, b) => a.name.localeCompare(b.name))),
      )
      .digest("hex");
  }
  async function verifiedSession(auth: AuthClient) {
    const sub = await verifiedSupabaseAccount(auth);
    if (!sub) return null;
    const { data, error } = await auth.getClaims();
    const session = data?.claims.session_id;
    return !error &&
      data?.claims.sub === sub &&
      typeof session === "string" &&
      /^[0-9a-f-]{36}$/i.test(session)
      ? { sub, session }
      : null;
  }
  async function post(action: AuthAction, request: NextRequest) {
    const failurePage =
      action === "register"
        ? "/register"
        : action === "recover"
          ? "/forgot-password"
          : action === "reset"
            ? "/reset-password"
            : action === "resend"
              ? "/confirm-email"
              : "/login";
    if (
      !requestMatchesOrigin(request) ||
      request.headers.get("origin") !== origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return new NextResponse("Invalid request origin", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    if (
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      return new NextResponse("Unsupported form", { status: 415 });
    // Bound the streamed body as well as any caller-supplied Content-Length.
    const reader = request.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return new NextResponse("Form is too large", { status: 413 });
        }
        chunks.push(value);
      }
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    const destination = safeReturnPath(form.get("returnTo"));
    const email = (form.get("email") || "").trim().toLowerCase();
    const password = form.get("password") || "";
    const fail = (error: string, field?: string) =>
      redirect(failurePage, {
        error,
        returnTo: destination,
        ...(field ? { field } : {}),
      });
    if (
      action !== "logout" &&
      action !== "reset" &&
      (!email ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
      return fail("validation", "email");
    if (
      ["login", "register", "reset"].includes(action) &&
      !validPassword(password)
    )
      return fail("validation", "password");
    if (
      ["register", "reset"].includes(action) &&
      form.get("passwordConfirmation") !== password
    )
      return fail("validation", "passwordConfirmation");
    if (!deps.allow(action, email)) {
      const response = fail("rate");
      if (action === "logout") {
        clear(response, ACCESS_COOKIE);
        clear(response, RECOVERY_COOKIE);
        clear(response, INTENT_COOKIE);
        clearSupabaseSessionCookies(request, response, true);
      }
      return response;
    }
    const { auth, finish } = deps.client(request);
    const complete = (r: NextResponse) => finish(r);
    let established = false;
    async function abandon(response: NextResponse) {
      try {
        await auth.signOut({ scope: "local" });
      } catch {
        /* Clear browser state regardless of provider availability. */
      }
      const result = complete(response);
      clear(result, ACCESS_COOKIE);
      clear(result, RECOVERY_COOKIE);
      clear(result, INTENT_COOKIE);
      clearSupabaseSessionCookies(request, result, true);
      return result;
    }
    try {
      if (action === "logout") {
        const { error } = await auth.signOut({ scope: "local" });
        const r = redirect("/login", { loggedOut: "1" });
        clear(r, RECOVERY_COOKIE);
        clear(r, INTENT_COOKIE);
        clear(r, ACCESS_COOKIE);
        const result = complete(error ? fail("unavailable") : r);
        clear(result, RECOVERY_COOKIE);
        clear(result, INTENT_COOKIE);
        clear(result, ACCESS_COOKIE);
        clearSupabaseSessionCookies(request, result, true);
        return result;
      }
      if (action === "login") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error)
          return complete(
            fail(
              error.code === "email_not_confirmed"
                ? "notconfirmed"
                : "credentials",
            ),
          );
        established = true;
        const session = await verifiedSession(auth);
        if (!session) return abandon(fail("credentials"));
        await deps.provision(session.sub);
        const r = redirect(destination);
        clear(r, RECOVERY_COOKIE);
        clear(r, INTENT_COOKIE);
        r.cookies.set(
          ACCESS_COOKIE,
          proofs.issue({ purpose: "access", ...session }, 8 * 3600),
          { ...cookieOptions, maxAge: 8 * 3600 },
        );
        return complete(r);
      }
      if (action === "reset") {
        const proof = proofs.read(
          request.cookies.get(RECOVERY_COOKIE)?.value,
          "recovery",
        );
        const session = await verifiedSession(auth);
        if (
          !proof ||
          !session ||
          proof.sub !== session.sub ||
          proof.session !== session.session ||
          !deps.replay.consume(proof)
        )
          return complete(fail("invalidlink"));
        established = true;
        const { error } = await auth.updateUser({ password });
        const r = error
          ? fail("unavailable")
          : redirect("/login", { status: "password-updated" });
        clear(r, RECOVERY_COOKIE);
        clear(r, INTENT_COOKIE);
        clear(r, ACCESS_COOKIE);
        return abandon(r);
      }
      const kind = action === "recover" ? "recovery" : "signup";
      // The intent nonce is returned in the approved same-origin callback URL;
      // the HMAC cookie also binds it to the SDK's issued PKCE verifier.
      const nonce = randomUUID();
      const callback = new URL("/auth/callback", origin);
      callback.searchParams.set("state", nonce);
      if (action === "register") {
        const { data, error } = await auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback.href },
        });
        if (
          error &&
          !["user_already_exists", "email_exists"].includes(error.code || "")
        )
          return complete(fail("unavailable"));
        // The app requires confirmation, even if provider configuration drifts.
        if (data.session) {
          established = true;
          await auth.signOut({ scope: "local" });
        }
      } else if (action === "resend") {
        await auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: callback.href },
        });
      } else {
        await auth.resetPasswordForEmail(email, { redirectTo: callback.href });
      }
      const r = redirect(
        action === "recover" ? "/forgot-password" : "/confirm-email",
        {
          status: action === "register" ? "pending" : "sent",
          returnTo: destination,
        },
      );
      clear(r, RECOVERY_COOKIE);
      clear(r, INTENT_COOKIE);
      const verifier = verifierHash(request);
      if (verifier)
        r.cookies.set(
          INTENT_COOKIE,
          proofs.issue(
            {
              purpose: "intent",
              kind,
              verifier,
              returnTo: `${nonce}|${destination}`,
            },
            3600,
          ),
          { ...cookieOptions, maxAge: 3600 },
        );
      return complete(r);
    } catch {
      return established
        ? abandon(fail("unavailable"))
        : complete(fail("unavailable"));
    }
  }
  async function callback(request: NextRequest, directToken = false) {
    const invalid = () => redirect("/login", { error: "invalidlink" });
    if (!requestMatchesOrigin(request)) return invalid();
    const params = request.nextUrl.searchParams;
    const { auth, finish } = deps.client(request);
    let established = false;
    async function abandon() {
      try {
        await auth.signOut({ scope: "local" });
      } catch {
        /* Clear local state without exposing provider errors. */
      }
      const result = finish(invalid());
      clear(result, ACCESS_COOKIE);
      clear(result, RECOVERY_COOKIE);
      clear(result, INTENT_COOKIE);
      clearSupabaseSessionCookies(request, result, true);
      return result;
    }
    try {
      let recovery = false;
      let destination = "/account";
      const intent = proofs.read(
        request.cookies.get(INTENT_COOKIE)?.value,
        "intent",
      );
      const [nonce, returnTo] = (intent?.returnTo || "").split("|");
      if (
        !intent ||
        !nonce ||
        params.get("state") !== nonce ||
        intent.verifier !== verifierHash(request)
      )
        return finish(invalid());
      if (directToken) {
        const token = params.get("token_hash");
        const type = params.get("type");
        if (
          !token ||
          !/^[A-Za-z0-9_-]{16,256}$/.test(token) ||
          !["signup", "recovery"].includes(type || "") ||
          type !== intent.kind ||
          !deps.replay.consume(intent)
        )
          return finish(invalid());
        const { error } = await auth.verifyOtp({
          token_hash: token,
          type: type as "signup" | "recovery",
        });
        if (error) return finish(invalid());
        established = true;
        recovery = type === "recovery";
        // Direct template links deliberately ignore arbitrary return/type flags.
      } else {
        const code = params.get("code");
        if (
          params.has("error") ||
          !code ||
          !/^[A-Za-z0-9_-]{16,256}$/.test(code) ||
          !deps.replay.consume(intent)
        )
          return finish(invalid());
        const { error } = await auth.exchangeCodeForSession(code);
        if (error) return finish(invalid());
        established = true;
        recovery = intent.kind === "recovery";
        destination = safeReturnPath(returnTo);
      }
      const session = await verifiedSession(auth);
      if (!session) return abandon();
      const r = redirect(recovery ? "/reset-password" : destination);
      clear(r, INTENT_COOKIE);
      clear(r, RECOVERY_COOKIE);
      clear(r, ACCESS_COOKIE);
      if (recovery) {
        r.cookies.set(
          RECOVERY_COOKIE,
          proofs.issue({ purpose: "recovery", ...session }, 600),
          { ...cookieOptions, maxAge: 600 },
        );
      } else {
        await deps.provision(session.sub);
        r.cookies.set(
          ACCESS_COOKIE,
          proofs.issue({ purpose: "access", ...session }, 8 * 3600),
          { ...cookieOptions, maxAge: 8 * 3600 },
        );
      }
      return finish(r);
    } catch {
      return established ? abandon() : finish(invalid());
    }
  }
  return { post, callback };
}
