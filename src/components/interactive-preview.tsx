"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { PreviewData } from "@/lib/exploration";
import { EXPLORATION_SPRING, useExploration } from "./exploration-provider";
const MotionLink = motion.create(Link);
function ExploredMark({ id }: { id: string }) {
  const { state } = useExploration();
  const reduced = useReducedMotion();
  if (!state.inspected.includes(id)) return null;
  return (
    <motion.span
      className="explored-mark"
      title="Explored · saved in this browser when storage is available"
      initial={{ scale: reduced ? 1 : 0.5 }}
      animate={{ scale: 1 }}
      transition={reduced ? { duration: 0 } : EXPLORATION_SPRING}
    >
      <Check size={11} />
      <span className="sr-only">Explored</span>
    </motion.span>
  );
}
export function PreviewLink({
  preview,
  children,
  className,
  card = false,
  label,
}: {
  preview: PreviewData;
  children: ReactNode;
  className?: string;
  card?: boolean;
  label?: string;
}) {
  const { preview: open } = useExploration();
  const reduced = useReducedMotion();
  return (
    <MotionLink
      href={preview.href}
      className={`${className || ""}${card ? " exploration-card" : ""}`}
      aria-label={label}
      aria-haspopup="dialog"
      title={`Preview ${preview.title}`}
      whileHover={card && !reduced ? { y: -3 } : undefined}
      whileTap={!reduced ? { scale: 0.985 } : undefined}
      transition={EXPLORATION_SPRING}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        open(preview, event.currentTarget);
      }}
    >
      {children}
      {card && <ExploredMark id={preview.id} />}
    </MotionLink>
  );
}
export function PreviewCard({
  preview,
  children,
  className,
}: {
  preview: PreviewData;
  children: ReactNode;
  className: string;
}) {
  const { preview: open } = useExploration();
  const reduced = useReducedMotion();
  return (
    <motion.article
      className={`${className} exploration-card`}
      whileHover={!reduced ? { y: -3 } : undefined}
      transition={EXPLORATION_SPRING}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest("a,button,input,select,textarea,form")
        ) {
          const link = event.currentTarget.querySelector<HTMLElement>(
            'a[aria-haspopup="dialog"]',
          );
          open(preview, link || undefined);
        }
      }}
    >
      {children}
      <ExploredMark id={preview.id} />
    </motion.article>
  );
}
export function ActiveDot() {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className="status-dot"
      aria-hidden="true"
      animate={reduced ? { opacity: 1 } : { opacity: [1, 0.5, 1] }}
      transition={{
        duration: 2.8,
        repeat: reduced ? 0 : Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
export function ExplorationProgress() {
  const { progress, returning, available, state } = useExploration();
  const reduced = useReducedMotion();
  const badge = !available
    ? "Interactive Workspace"
    : returning
      ? "Welcome Back — Progress Saved"
      : state.inspected.length
        ? "Progress Saved"
        : "Interactive Workspace";
  return (
    <div
      className="mt-6 flex items-center gap-2 text-xs exploration-summary"
      title="A 20% head start. Inspect eight different cards to complete this discovery session."
    >
      <motion.span
        key={progress}
        initial={false}
        animate={{ scale: 1 }}
        transition={EXPLORATION_SPRING}
      >
        <Check size={15} />
      </motion.span>
      <span role="status" aria-live="polite">
        {progress}% Explored
      </span>
      <span className="exploration-micro-badge" title={badge}>
        {badge}
      </span>
      <span
        role="progressbar"
        aria-label="Exploration progress, including a 20 percent head start"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="exploration-meter"
      >
        <motion.span
          initial={false}
          animate={{ scaleX: progress / 100 }}
          transition={reduced ? { duration: 0 } : EXPLORATION_SPRING}
        />
      </span>
    </div>
  );
}
