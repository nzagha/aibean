import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { qaAuth, qaSettings } from "./runtime";
import {
  ACCESS_COOKIE,
  RECOVERY_COOKIE,
  MAILBOX_COOKIE,
  emailInput,
  passwordInput,
  QaRateError,
} from "./core";
import { isSameOrigin, requestOrigin } from "../request-origin";
import { safeReturnPath } from "../catalog/filter";
import { refreshFixtureHandoff } from "./handoff";
export async function qaPost(operation: string, request: NextRequest) {
  const config = qaSettings();
  const origin = requestOrigin(request);
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, origin), 303);
    result.headers.set("Cache-Control", "no-store");
    result.headers.set("Referrer-Policy", "no-referrer");
    return result;
  };
  if (!isSameOrigin(request))
    return new NextResponse("Invalid request origin", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return new NextResponse("Form too large", { status: 413 });
  const body = await request.text();
  if (body.length > 8192)
    return new NextResponse("Form too large", { status: 413 });
  const form = new URLSearchParams(body);
  const get = (key: string) => form.get(key) || "";
  const auth = qaAuth();
  const setCookie = (
    r: NextResponse,
    name: string,
    value: string,
    seconds = 8 * 3600,
  ) =>
    r.cookies.set(name, value, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: seconds,
    });
  const clear = (r: NextResponse) => {
    setCookie(r, ACCESS_COOKIE, "", 0);
    setCookie(r, RECOVERY_COOKIE, "", 0);
  };
  const errorPath =
    operation === "change"
      ? "/account/security"
      : operation === "reset"
        ? "/reset-password"
        : operation === "forgot"
          ? "/forgot-password"
          : operation === "register"
            ? "/register"
            : operation === "mailbox"
              ? "/local-mailbox"
              : "/login";
  try {
    if (operation === "register") {
      const email = emailInput(get("email"));
      passwordInput(get("password"), get("confirmPassword"));
      await auth.register(email, get("password"));
      return response("/register?status=sent");
    }
    if (operation === "login") {
      const token = await auth.login(emailInput(get("email")), get("password"));
      if (!token) return response("/login?error=credentials");
      const r = response(safeReturnPath(get("returnTo")));
      setCookie(r, ACCESS_COOKIE, token);
      setCookie(r, RECOVERY_COOKIE, "", 0);
      return r;
    }
    if (operation === "logout") {
      await auth.logout(request.cookies.get(ACCESS_COOKIE)?.value);
      const r = response("/login?loggedOut=1");
      clear(r);
      return r;
    }
    if (operation === "forgot") {
      await auth.forgot(emailInput(get("email")));
      return response("/forgot-password?status=sent");
    }
    if (operation === "exchange") {
      if (
        !(await auth.mailboxAllowed(request.cookies.get(MAILBOX_COOKIE)?.value))
      )
        return new NextResponse("Mailbox authorization required", {
          status: 403,
        });
      const value = await auth.exchange(get("token"), get("purpose"));
      if (!value) return response("/local-mailbox?error=invalidlink");
      if (value === "verified") return response("/login?status=verified");
      const r = response("/reset-password");
      clear(r);
      setCookie(r, RECOVERY_COOKIE, value, 15 * 60);
      return r;
    }
    if (operation === "change") {
      const changingUser = await auth.identity(
        request.cookies.get(ACCESS_COOKIE)?.value,
      );
      passwordInput(get("password"), get("confirmPassword"));
      if (
        !(await auth.change(
          request.cookies.get(ACCESS_COOKIE)?.value || "",
          get("currentPassword"),
          get("password"),
        ))
      )
        return response("/account/security?error=current");
      let handoffStatus = "";
      try {
        await refreshFixtureHandoff(changingUser, get("password"));
      } catch {
        handoffStatus = "&handoff=stale";
      }
      const r = response("/login?status=changed" + handoffStatus);
      clear(r);
      return r;
    }
    if (operation === "reset") {
      const resettingUser = await auth.identity(
        request.cookies.get(RECOVERY_COOKIE)?.value,
        "recovery",
      );
      passwordInput(get("password"), get("confirmPassword"));
      if (
        !(await auth.reset(
          request.cookies.get(RECOVERY_COOKIE)?.value || "",
          get("password"),
        ))
      )
        return response("/reset-password?error=invalidlink");
      let handoffStatus = "";
      try {
        await refreshFixtureHandoff(resettingUser, get("password"));
      } catch {
        handoffStatus = "&handoff=stale";
      }
      const r = response("/login?status=changed" + handoffStatus);
      clear(r);
      return r;
    }
    if (operation === "mailbox") {
      const token = await auth.mailboxLogin(
        get("password"),
        config.mailboxHash,
      );
      if (!token) return response("/local-mailbox?error=credentials");
      const r = response("/local-mailbox");
      setCookie(r, MAILBOX_COOKIE, token);
      return r;
    }
    return new NextResponse("Unavailable", { status: 404 });
  } catch (error) {
    if (error instanceof QaRateError)
      return response(errorPath + "?error=rate");
    const field =
      error instanceof Error &&
      ["email", "password", "confirmation"].includes(error.message)
        ? error.message
        : "unavailable";
    return response(errorPath + "?error=" + field);
  }
}
