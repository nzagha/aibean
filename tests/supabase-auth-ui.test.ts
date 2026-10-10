import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type {
  SupabaseAuthForm,
  SupabaseAuthView,
} from "../src/components/supabase-auth-form";

async function withForm(
  props: Parameters<typeof SupabaseAuthForm>[0],
  check: (
    dom: JSDOM,
    render: (next: Parameters<typeof SupabaseAuthForm>[0]) => Promise<void>,
  ) => Promise<void>,
) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:3000/login",
    pretendToBeVisual: true,
  });
  const globals = {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  let root: Root | undefined;
  try {
    const { createRoot } = await import("react-dom/client");
    const { SupabaseAuthForm } =
      await import("../src/components/supabase-auth-form");
    root = createRoot(dom.window.document.getElementById("root")!);
    const render = async (next: Parameters<typeof SupabaseAuthForm>[0]) => {
      await act(async () => {
        root!.render(createElement(SupabaseAuthForm, next));
      });
    };
    await render(props);
    await check(dom, render);
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("branded candidate registration validates fields accessibly and prevents duplicate requests without losing submitted values", async () => {
  await withForm({ view: "register", returnTo: "/saved" }, async (dom) => {
    const form = dom.window.document.querySelector("form")!;
    const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
    const password = form.querySelector<HTMLInputElement>('[name="password"]')!;
    const confirmation = form.querySelector<HTMLInputElement>(
      '[name="passwordConfirmation"]',
    )!;
    assert.ok(dom.window.document.querySelector(".placeholder-card"));
    assert.equal(form.getAttribute("action"), "/api/auth/register");
    assert.equal(form.method, "post");
    assert.equal(email.maxLength, 254);
    assert.equal(password.maxLength, 128);
    const invalid = new dom.window.Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      form.dispatchEvent(invalid);
    });
    assert.equal(invalid.defaultPrevented, true);
    assert.equal(email.getAttribute("aria-invalid"), "true");
    assert.equal(dom.window.document.activeElement, email);
    const errorId = email.getAttribute("aria-describedby")!;
    assert.match(
      dom.window.document.getElementById(errorId)!.textContent!,
      /valid email/,
    );

    email.value = "candidate@example.test";
    password.value = "ordinarypassword";
    confirmation.value = "different";
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(password.getAttribute("aria-invalid"), "true");
    assert.equal(confirmation.getAttribute("aria-invalid"), "true");
    assert.match(
      dom.window.document.body.textContent!,
      /Both passwords must match/,
    );

    password.value = "Candidate123!";
    confirmation.value = password.value;
    const valid = new dom.window.Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      form.dispatchEvent(valid);
    });
    assert.equal(valid.defaultPrevented, false);
    assert.equal(form.getAttribute("aria-busy"), "true");
    assert.equal(form.querySelector("button")!.disabled, true);
    assert.equal(
      password.disabled,
      false,
      "disabled password inputs would disappear from native POST serialization",
    );
    const data = new dom.window.FormData(form);
    assert.equal(data.get("email"), email.value);
    assert.equal(data.get("password"), password.value);
    assert.equal(data.get("passwordConfirmation"), password.value);
    assert.equal(data.get("returnTo"), "/saved");
    const duplicate = new dom.window.Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      form.dispatchEvent(duplicate);
    });
    assert.equal(duplicate.defaultPrevented, true);
    assert.equal(
      dom.window.localStorage.length,
      0,
      "credentials are not persisted in browser storage",
    );
  });
});

test("candidate recovery, confirmation and invalid-link states use generic feedback and safe in-context routes", async () => {
  await withForm(
    { view: "reset", returnTo: "/account", error: "expired" },
    async (dom, render) => {
      assert.equal(dom.window.document.querySelector("form"), null);
      assert.match(
        dom.window.document.querySelector('[role="alert"]')!.textContent!,
        /expired/,
      );
      assert.ok(
        dom.window.document.querySelector('a[href^="/forgot-password?"]'),
      );
      await render({
        view: "reset",
        returnTo: "/account",
        error: "invalidlink",
      });
      assert.equal(dom.window.document.querySelector("form"), null);
      assert.match(dom.window.document.body.textContent!, /already been used/);

      await render({ view: "forgot", returnTo: "/account", status: "sent" });
      assert.equal(
        dom.window.document.querySelector("form")!.getAttribute("action"),
        "/api/auth/recover",
      );
      assert.match(
        dom.window.document.querySelector('[role="status"]')!.textContent!,
        /If an account matches/,
      );
      assert.equal(
        dom.window.document.querySelector('input[type="password"]'),
        null,
      );
      await render({
        view: "confirmation",
        returnTo: "/account",
        status: "sent",
      });
      assert.equal(
        dom.window.document.querySelector("form")!.getAttribute("action"),
        "/api/auth/resend",
      );
      assert.match(
        dom.window.document.querySelector('[role="status"]')!.textContent!,
        /If your address is eligible/,
      );
      assert.equal(
        dom.window.document
          .querySelector('input[name="email"]')!
          .getAttribute("value"),
        null,
      );

      await render({
        view: "login",
        returnTo: "/tools?free=true",
        error: "notconfirmed",
      });
      assert.ok(
        dom.window.document.querySelector('a[href^="/confirm-email?"]'),
      );
      assert.ok(
        dom.window.document.querySelector(
          'a[href="/register?returnTo=%2Ftools%3Ffree%3Dtrue"]',
        ),
      );
      assert.equal(
        dom.window.document.querySelectorAll('input[type="password"]').length,
        1,
      );
      await render({
        view: "login",
        returnTo: "/account",
        error: "untrusted-message",
      });
      assert.equal(dom.window.document.querySelector('[role="alert"]'), null);
      assert.ok(
        !dom.window.document.body.textContent!.includes("untrusted-message"),
      );
      assert.ok(
        !/Google|Apple|WhatsApp|passkey/i.test(
          dom.window.document.body.textContent!,
        ),
      );
    },
  );
});

test("candidate form views post only to their own routes and identify server validation errors", async () => {
  const actions: Record<SupabaseAuthView, string> = {
    login: "/api/auth/login",
    register: "/api/auth/register",
    forgot: "/api/auth/recover",
    reset: "/api/auth/reset",
    confirmation: "/api/auth/resend",
  };
  await withForm(
    { view: "login", returnTo: "/account" },
    async (dom, render) => {
      for (const [view, action] of Object.entries(actions)) {
        await render({ view: view as SupabaseAuthView, returnTo: "/account" });
        assert.equal(
          dom.window.document.querySelector("form")!.getAttribute("action"),
          action,
        );
      }
      await render({
        view: "register",
        returnTo: "/account",
        error: "validation",
        field: "passwordConfirmation",
      });
      const confirmation = dom.window.document.querySelector<HTMLInputElement>(
        '[name="passwordConfirmation"]',
      )!;
      assert.equal(confirmation.getAttribute("aria-invalid"), "true");
      assert.match(
        dom.window.document.body.textContent!,
        /Both passwords must match/,
      );
    },
  );
});
