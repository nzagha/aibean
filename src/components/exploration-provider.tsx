"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  animate,
} from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  EMPTY_EXPLORATION,
  parseExploration,
  inspectNode,
  explorationProgress,
  type PreviewData,
  type ExplorationState,
} from "@/lib/exploration";

export const EXPLORATION_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 20,
} as const;
type Context = {
  state: ExplorationState;
  progress: number;
  ready: boolean;
  available: boolean;
  returning: boolean;
  inspect: (id: string) => void;
  expand: (id: string) => void;
  reset: () => void;
  preview: (data: PreviewData, trigger?: HTMLElement) => void;
};
const ExplorationContext = createContext<Context | null>(null);
export function useExploration() {
  const context = useContext(ExplorationContext);
  if (!context) throw new Error("ExplorationProvider is required.");
  return context;
}

// Adds tactile spring feedback to existing controls without inserting DOM wrappers
// or changing their sizing. No form contents or personal information are recorded.
function ButtonPhysics() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced !== false) return;
    const animations = new Map<HTMLElement, ReturnType<typeof animate>>();
    const pressed = new Set<HTMLElement>();
    const selector = "button:not([disabled]), a.button, a.icon-button";
    function target(event: Event) {
      return event.target instanceof Element
        ? event.target.closest<HTMLElement>(selector)
        : null;
    }
    function play(node: HTMLElement, scale: number) {
      animations.get(node)?.stop();
      const animation = animate(node, { scale }, EXPLORATION_SPRING);
      animations.set(node, animation);
      void animation.then(() => {
        if (animations.get(node) === animation) animations.delete(node);
      });
    }
    function over(event: PointerEvent) {
      const node = target(event);
      if (
        node &&
        event.pointerType !== "touch" &&
        !node.contains(event.relatedTarget as Node | null)
      )
        play(node, 1.025);
    }
    function out(event: PointerEvent) {
      const node = target(event);
      if (node && !node.contains(event.relatedTarget as Node | null))
        play(node, 1);
    }
    function down(event: PointerEvent) {
      const node = target(event);
      if (node) {
        pressed.add(node);
        play(node, 0.97);
      }
    }
    function up() {
      for (const node of pressed) play(node, 1);
      pressed.clear();
    }
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      for (const animation of animations.values()) animation.stop();
    };
  }, [reduced]);
  return null;
}

export function ExplorationProvider({ children }: { children: ReactNode }) {
  const storage = useLocalStorage(
    "aibean:exploration:v1",
    EMPTY_EXPLORATION,
    parseExploration,
  );
  const [active, setActive] = useState<PreviewData | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const path = usePathname();
  useEffect(() => {
    // Navigation must close the old page's modal and run its focus/scroll cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(null);
  }, [path]);
  useEffect(() => {
    if (!active) return;
    if (!dialog.current?.open) dialog.current?.showModal();
    const oldOverflow = document.body.style.overflow;
    const oldPadding = document.body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    return () => {
      document.body.style.overflow = oldOverflow;
      document.body.style.paddingRight = oldPadding;
    };
  }, [active]);
  const inspect = (id: string) =>
    storage.setValue((state) => inspectNode(state, id));
  const reset = () => storage.setValue(EMPTY_EXPLORATION);
  const context: Context = {
    state: storage.value,
    progress: explorationProgress(storage.value),
    ready: storage.ready,
    available: storage.available,
    returning: storage.restored && storage.value.inspected.length > 0,
    inspect,
    reset,
    expand: (id) =>
      storage.setValue((state) => ({
        ...state,
        expanded: state.expanded.includes(id)
          ? state.expanded.filter((item) => item !== id)
          : [...state.expanded, id],
      })),
    preview: (data, element) => {
      trigger.current = element || (document.activeElement as HTMLElement);
      inspect(data.id);
      setActive(data);
    },
  };
  return (
    <MotionConfig reducedMotion="user" transition={EXPLORATION_SPRING}>
      <ExplorationContext.Provider value={context}>
        <ButtonPhysics />
        {children}
        <dialog
          ref={dialog}
          className="exploration-dialog"
          aria-label="Explore this item"
          onCancel={(event) => {
            event.preventDefault();
            setActive(null);
          }}
          onClick={(event) => {
            if (event.target === dialog.current) setActive(null);
          }}
        >
          <AnimatePresence
            onExitComplete={() => {
              if (active) return;
              dialog.current?.close();
              if (trigger.current?.isConnected)
                trigger.current.focus({ preventScroll: true });
            }}
          >
            {active && (
              <motion.div
                key={active.id}
                className="exploration-drawer"
                initial={{ x: reduced ? 0 : "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduced ? 0 : "100%", opacity: 0 }}
                transition={reduced ? { duration: 0 } : EXPLORATION_SPRING}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="eyebrow">A closer look</span>
                  <button
                    autoFocus
                    className="icon-button"
                    onClick={() => setActive(null)}
                    aria-label="Close preview"
                  >
                    <X size={20} />
                  </button>
                </div>
                <h2 className="mt-6">{active.title}</h2>
                <p className="mt-5">{active.summary}</p>
                {active.notice && (
                  <p className="preview-notice mt-5">{active.notice}</p>
                )}
                <div className="mt-6">
                  {active.details.map((detail, index) => {
                    const id = `${active.id}:detail-${index}`;
                    const expanded = storage.value.expanded.includes(id);
                    return (
                      <div className="exploration-detail" key={id}>
                        <button
                          className="exploration-detail-trigger"
                          aria-expanded={expanded}
                          aria-controls={`preview-${id}`}
                          onClick={() => context.expand(id)}
                        >
                          {detail.title}
                          <motion.span
                            animate={{ rotate: expanded ? 180 : 0 }}
                            transition={EXPLORATION_SPRING}
                          >
                            <ChevronDown size={17} />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              id={`preview-${id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={
                                reduced ? { duration: 0 } : EXPLORATION_SPRING
                              }
                              style={{ overflow: "hidden" }}
                            >
                              <p className="pb-5 text-sm">{detail.text}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
                <Link
                  className="button primary mt-8"
                  href={active.href}
                  onClick={() => setActive(null)}
                >
                  {active.linkLabel}
                  <ArrowUpRight size={17} />
                </Link>
                <div className="mt-8 border-t border-line pt-5">
                  <p className="text-xs">
                    <Check size={13} className="inline mr-1" />
                    {storage.available
                      ? "Exploration saved in this browser."
                      : "Progress is available for this visit; browser storage is unavailable."}
                  </p>
                  <p className="text-xs mt-2">
                    20% head start + 10% per new discovery, up to eight.
                  </p>
                  <button className="text-link text-xs mt-4" onClick={reset}>
                    Reset exploration
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </dialog>
      </ExplorationContext.Provider>
    </MotionConfig>
  );
}
