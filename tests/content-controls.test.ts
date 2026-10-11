import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
test("Ordered Playbook steps and Stack tools support accessible reorder/add/remove controls and submit the actual order", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
      url: "http://localhost:3000",
      pretendToBeVisual: true,
    }),
    previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    React,
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  let root: Root | undefined;
  try {
    const { createRoot } = await import("react-dom/client"),
      { PlaybookSteps } = await import("../src/components/playbook-steps"),
      { StackOrder } = await import("../src/components/stack-order");
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () =>
      root!.render(
        createElement(
          "form",
          {},
          createElement(PlaybookSteps, {
            initial: [
              {
                title: "First step",
                instruction: "First complete synthetic instruction.",
              },
              {
                title: "Second step",
                instruction: "Second complete synthetic instruction.",
              },
            ],
          }),
        ),
      ),
    );
    const click = async (selector: string) =>
      act(async () =>
        dom.window.document.querySelector<HTMLButtonElement>(selector)!.click(),
      );
    assert.equal(
      dom.window.document.querySelector<HTMLButtonElement>(
        '[aria-label="Move step 1 up"]',
      )!.disabled,
      true,
    );
    await click('[aria-label="Move step 2 up"]');
    let steps = JSON.parse(
      String(
        new dom.window.FormData(dom.window.document.querySelector("form")!).get(
          "steps",
        ),
      ),
    );
    assert.equal(steps[0].title, "Second step");
    await click('[aria-label="Remove step 2"]');
    steps = JSON.parse(
      String(
        new dom.window.FormData(dom.window.document.querySelector("form")!).get(
          "steps",
        ),
      ),
    );
    assert.equal(steps.length, 1);
    assert.equal(
      dom.window.document.querySelector<HTMLButtonElement>(
        '[aria-label="Remove step 1"]',
      )!.disabled,
      true,
    );
    await act(async () =>
      Array.from(dom.window.document.querySelectorAll("button"))
        .find((b) => b.textContent === "Add step")!
        .click(),
    );
    assert.equal(
      JSON.parse(
        String(
          new dom.window.FormData(
            dom.window.document.querySelector("form")!,
          ).get("steps"),
        ),
      ).length,
      2,
    );
    await act(async () =>
      root!.render(
        createElement(
          "form",
          {},
          createElement(StackOrder, {
            members: [
              { id: "tool-a", name: "Alpha" },
              { id: "tool-b", name: "Beta" },
            ],
          }),
        ),
      ),
    );
    await click('[aria-label="Move Beta earlier"]');
    assert.equal(
      new dom.window.FormData(dom.window.document.querySelector("form")!).get(
        "orderedToolIds",
      ),
      "tool-b\ntool-a",
    );
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
