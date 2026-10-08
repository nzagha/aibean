import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLocalStorage } from "../src/hooks/use-local-storage";
import {
  EMPTY_EXPLORATION,
  parseExploration,
  inspectNode,
} from "../src/lib/exploration";

test("persistent exploration survives remount, synchronizes tabs, and tolerates blocked or corrupt storage", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://aibean.test",
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
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
  let storage: ReturnType<typeof useLocalStorage<typeof EMPTY_EXPLORATION>>;
  function Probe() {
    storage = useLocalStorage(
      "test:exploration",
      EMPTY_EXPLORATION,
      parseExploration,
    );
    return createElement("span", null, storage.value.inspected.length);
  }
  async function mount() {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => root!.render(createElement(Probe)));
  }
  async function unmount() {
    await act(async () => root?.unmount());
    root = undefined;
  }
  try {
    await mount();
    assert.equal(storage!.ready, true);
    assert.equal(storage!.restored, false);
    await act(async () => {
      storage!.setValue((state) => inspectNode(state, "tool:first"));
      storage!.setValue((state) => inspectNode(state, "tool:second"));
    });
    assert.equal(
      storage!.value.inspected.length,
      2,
      "rapid functional updates are not lost",
    );
    await unmount();
    await mount();
    assert.equal(storage!.restored, true);
    assert.equal(storage!.value.inspected.length, 2);
    await act(async () => {
      dom.window.localStorage.setItem(
        "test:exploration",
        JSON.stringify({
          inspected: ["category:one"],
          expanded: ["category:one:detail-0"],
        }),
      );
      dom.window.dispatchEvent(
        new dom.window.StorageEvent("storage", { key: "test:exploration" }),
      );
    });
    assert.deepEqual(storage!.value.expanded, ["category:one:detail-0"]);
    await act(async () => storage!.setValue(EMPTY_EXPLORATION));
    await unmount();
    await mount();
    assert.equal(storage!.value.inspected.length, 0, "reset persists");
    await unmount();
    dom.window.localStorage.setItem("test:exploration", "{bad-json");
    await mount();
    assert.deepEqual(storage!.value, EMPTY_EXPLORATION);
    await unmount();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {
          throw new Error("blocked");
        },
      },
      configurable: true,
    });
    await mount();
    await act(async () =>
      storage!.setValue((state) => inspectNode(state, "tool:memory")),
    );
    assert.equal(storage!.available, false);
    assert.deepEqual(storage!.value.inspected, ["tool:memory"]);
  } finally {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
