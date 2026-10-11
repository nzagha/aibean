import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
test("Shared ActionForm retains invalid input, exposes errors, resets successful input and honors confirmation", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost:3000/admin",
    pretendToBeVisual: true,
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
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
  let calls = 0;
  let fail = true;
  try {
    const { createRoot } = await import("react-dom/client");
    const { ActionForm } = await import("../src/components/action-form");
    root = createRoot(dom.window.document.getElementById("root")!);
    dom.window.confirm = () => false;
    await act(async () =>
      root!.render(
        createElement(ActionForm, {
          action: async (_state, form) => {
            calls++;
            assert.equal(form.get("name"), "Preserved input");
            return fail
              ? { error: "Fix the synthetic invalid field." }
              : { message: "Saved." };
          },
          label: "Save",
          confirmation: "Confirm?",
          children: createElement(
            "label",
            {},
            "Name",
            createElement("input", { name: "name", defaultValue: "Original" }),
          ),
        }),
      ),
    );
    const form = dom.window.document.querySelector("form")!;
    const input = dom.window.document.querySelector("input")!;
    input.value = "Preserved input";
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(calls, 0);
    dom.window.confirm = () => true;
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(calls, 1);
    assert.equal(input.value, "Preserved input");
    assert.match(
      dom.window.document.querySelector('[role="alert"]')!.textContent!,
      /invalid field/,
    );
    fail = false;
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(calls, 2);
    assert.equal(input.value, "Original");
    assert.match(
      dom.window.document.querySelector('[role="status"]')!.textContent!,
      /Saved/,
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
