import { createElement, Fragment } from "react";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { Header } from "../../src/components/header";
import { ExplorationProvider } from "../../src/components/exploration-provider";
import {
  ActiveDot,
  ExplorationProgress,
} from "../../src/components/interactive-preview";

export function headerTree() {
  return createElement(
    PathnameContext.Provider,
    { value: "/" },
    createElement(ExplorationProvider, {
      children: createElement(
        Fragment,
        null,
        createElement(Header),
        createElement(ActiveDot),
        createElement(ExplorationProgress),
      ),
    }),
  );
}
