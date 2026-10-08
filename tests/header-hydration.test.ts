import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { act } from "react";
import type { Root } from "react-dom/client";

test("server-rendered header hydrates with reduced motion without attribute mismatches", async () => {
  // A separate process ensures server rendering cannot read the browser preference
  // or reuse Motion's client-side module state.
  const html = execFileSync(
    process.execPath,
    ["--import", "tsx", "tests/fixtures/header-ssr.ts"],
    { encoding: "utf8" },
  );
  const dom = new JSDOM(`<div id="root">${html}</div>`, {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({
      matches: true,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const values = {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    SVGElement: dom.window.SVGElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(values)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(" "));
  let root: Root | undefined;
  try {
    const { hydrateRoot } = await import("react-dom/client");
    const { headerTree } = await import("./fixtures/header-tree");
    await act(async () => {
      root = hydrateRoot(
        dom.window.document.getElementById("root")!,
        headerTree(),
        { onRecoverableError: (error) => errors.push(String(error)) },
      );
    });
    assert.deepEqual(
      errors,
      [],
      "hydration must not warn or recover from mismatched markup",
    );
    const dialog = dom.window.document.getElementById(
      "mobile-navigation",
    ) as HTMLDialogElement;
    assert.equal(dialog.open, false);
    await act(async () =>
      dom.window.document
        .querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')!
        .click(),
    );
    assert.equal(dialog.open, true);
    await act(async () =>
      dom.window.document
        .querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')!
        .click(),
    );
    assert.equal(dialog.open, false);
  } finally {
    await act(async () => root?.unmount());
    console.error = originalError;
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
