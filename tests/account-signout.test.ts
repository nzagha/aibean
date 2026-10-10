import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { AccountSignOut } from "../src/components/account-signout";

test("Supabase/password account logout renders the existing branded form without a Clerk provider", () => {
  for (const mode of ["password", "supabase"] as const) {
    const normal = renderToStaticMarkup(createElement(AccountSignOut, { mode }));
    const form = new JSDOM(normal).window.document.querySelector("form")!;
    assert.equal(form.getAttribute("action"), "/api/auth/logout");
    assert.equal(form.getAttribute("method"), "post");
    assert.equal(form.querySelector("button")?.className, "button secondary");
    const compact = renderToStaticMarkup(createElement(AccountSignOut, { mode, compact: true }));
    const smallForm = new JSDOM(compact).window.document.querySelector("form")!;
    assert.equal(smallForm.className, "mt-6");
    assert.equal(smallForm.getAttribute("action"), "/api/auth/logout");
    assert.equal(smallForm.querySelector("button")?.textContent, "Sign out");
  }
  assert.equal(renderToStaticMarkup(createElement(AccountSignOut, { mode: "disabled" })), "");
});
