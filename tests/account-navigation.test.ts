import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  resolveAccountNavigation,
  guestNavigation,
} from "../src/lib/account-navigation";
import { Header } from "../src/components/header";
import { RegistrationUnavailable } from "../src/components/registration-unavailable";

Object.assign(globalThis, { React });

test("navigation uses canonical additive capabilities and tool ownership, fails closed", async () => {
  let reads = 0;
  assert.deepEqual(
    await resolveAccountNavigation(
      null,
      async () => {
        reads++;
        return undefined;
      },
      async () => [],
    ),
    guestNavigation,
  );
  assert.equal(reads, 0);
  for (const [admin, creator, vendor] of [
    [false, false, false],
    [true, false, false],
    [false, true, false],
    [false, false, true],
    [true, true, true],
  ]) {
    const links = await resolveAccountNavigation(
      "user-a",
      async () => ({ id: "user-a", isAdmin: admin, isCreator: creator }),
      async () => (vendor ? [{ userId: "user-a", toolId: "tool-a" }] : []),
    );
    assert.equal(
      links.some((link) => link.href === "/admin"),
      admin,
    );
    assert.equal(
      links.some((link) => link.href === "/creator"),
      creator,
    );
    assert.equal(
      links.some((link) => link.href === "/vendor"),
      vendor,
    );
    assert.ok(links.some((link) => link.href === "/account"));
    const doc = new JSDOM(
      renderToStaticMarkup(
        React.createElement(
          PathnameContext.Provider,
          { value: "/admin" },
          React.createElement(Header, { accountLinks: links }),
        ),
      ),
    ).window.document;
    const mobile = doc.querySelector('[aria-label="Mobile navigation"]')!;
    for (const link of links)
      assert.equal(
        mobile.querySelector(`a[href="${link.href}"]`)?.textContent,
        link.label,
      );
    assert.equal(
      doc.querySelector(
        '[aria-label="Account workspaces"] a[href="/admin"]',
      ) !== null,
      admin,
    );
  }
  for (const readUser of [
    async () => undefined,
    async () => ({ id: "other", isAdmin: true, isCreator: true }),
    async () => {
      throw Error("offline");
    },
  ]) {
    assert.deepEqual(
      await resolveAccountNavigation("user-a", readUser, async () => []),
      [{ label: "My Account", href: "/account" }],
    );
  }
  const wrongOwnership = await resolveAccountNavigation(
    "user-a",
    async () => ({ id: "user-a", isAdmin: false, isCreator: false }),
    async () => [{ userId: "user-b", toolId: "tool-b" }],
  );
  assert.equal(
    wrongOwnership.some((link) => link.href === "/vendor"),
    false,
  );
});

test("guests have matching desktop/mobile signup and login, retain discovery links even on admin URL", () => {
  const doc = new JSDOM(
    renderToStaticMarkup(
      React.createElement(
        PathnameContext.Provider,
        { value: "/admin" },
        React.createElement(Header),
      ),
    ),
  ).window.document;
  assert.equal(doc.querySelector('a[href="/admin"]'), null);
  for (const { href, label } of guestNavigation) {
    const matches = doc.querySelectorAll(`a[href="${href}"]`);
    assert.equal(matches.length, 2);
    matches.forEach((link) => assert.equal(link.textContent, label));
  }
  for (const nav of ["Main navigation", "Mobile navigation"]) {
    const element = doc.querySelector(`[aria-label="${nav}"]`)!;
    for (const href of [
      "/tools",
      "/skills",
      "/events",
      "/creators",
      "/submit",
      "/for-vendors",
    ])
      assert.ok(element.querySelector(`a[href="${href}"]`));
  }
});

test("registration unavailable state cannot submit and clearly explains approval boundaries", () => {
  const doc = new JSDOM(
    renderToStaticMarkup(React.createElement(RegistrationUnavailable)),
  ).window.document;
  assert.equal(doc.querySelector("form"), null);
  assert.match(doc.body.textContent!, /Registration is not open yet/);
  assert.match(doc.body.textContent!, /No account has been created/);
  assert.match(doc.body.textContent!, /separate approval/);
});

test("server route guards and ordinary provisioning remain wired independently of navigation", async () => {
  const [admin, auth, ordinary, handler, page] = await Promise.all([
    readFile("src/app/admin/page.tsx", "utf8"),
    readFile("src/lib/auth.ts", "utf8"),
    readFile("src/lib/db/ordinary-user.ts", "utf8"),
    readFile("src/lib/supabase/auth-handler.ts", "utf8"),
    readFile("src/components/auth-page.tsx", "utf8"),
  ]);
  assert.match(admin, /await requireAdmin\(\)/);
  assert.match(auth, /hasCapability\(user, "admin"\)/);
  assert.match(ordinary, /INSERT INTO \$\{users\} \("id"\)/);
  assert.match(handler, /if \(!providerTestApproved\(\)\)/);
  assert.match(page, /register && \(password \|\| !authConfigured\(\)\)/);
  assert.match(page, /<RegistrationUnavailable/);
});
