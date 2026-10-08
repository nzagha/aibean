import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";

test("preview stays in context, preserves expanded insights, and restores return progress", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
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
  const globals = {
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
    const { ExplorationProvider } =
      await import("../src/components/exploration-provider");
    const { PreviewLink, ExplorationProgress } =
      await import("../src/components/interactive-preview");
    const preview = {
      id: "category:test",
      title: "Test category",
      summary: "A preview",
      href: "/tools",
      linkLabel: "View tools",
      details: [{ title: "Inspect the fit", text: "A useful deeper insight." }],
    };
    const app = () =>
      createElement(ExplorationProvider, {
        children: createElement(
          Fragment,
          null,
          createElement(ExplorationProgress),
          createElement(PreviewLink, {
            preview,
            card: true,
            children: "Open preview",
          }),
        ),
      });
    const mount = async () => {
      root = createRoot(dom.window.document.getElementById("root")!);
      await act(async () => root!.render(app()));
    };
    const click = async (selector: string) => {
      const node = dom.window.document.querySelector<HTMLElement>(selector);
      assert.ok(node, selector);
      await act(async () => {
        node.click();
      });
    };
    await mount();
    assert.equal(
      dom.window.document
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
      "20",
    );
    await click('a[aria-haspopup="dialog"]');
    assert.equal(dom.window.document.querySelector("dialog")?.open, true);
    assert.equal(dom.window.location.pathname, "/");
    assert.equal(
      dom.window.document
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
      "30",
    );
    await click(".exploration-detail-trigger");
    assert.equal(
      dom.window.document
        .querySelector(".exploration-detail-trigger")
        ?.getAttribute("aria-expanded"),
      "true",
    );
    assert.ok(
      dom.window.document.body.textContent?.includes(
        "A useful deeper insight.",
      ),
    );
    await click('[aria-label="Close preview"]');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    assert.equal(dom.window.document.querySelector("dialog")?.open, false);
    await click('a[aria-haspopup="dialog"]');
    assert.equal(
      dom.window.document
        .querySelector(".exploration-detail-trigger")
        ?.getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(
      dom.window.document
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
      "30",
    );
    await act(async () => root?.unmount());
    root = undefined;
    await mount();
    assert.ok(
      dom.window.document.body.textContent?.includes(
        "Welcome Back — Progress Saved",
      ),
    );
    assert.equal(dom.window.document.querySelector("dialog")?.open, false);
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
