"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "./logo";
import {
  guestNavigation,
  type AccountNavigation,
} from "@/lib/account-navigation";
import { motion, useReducedMotion } from "framer-motion";
import { EXPLORATION_SPRING } from "./exploration-provider";

const links = [
  ["AI Tools", "/tools"],
  ["AI Skills", "/skills"],
  ["Events", "/events"],
  ["Creators", "/creators"],
  ["Submit", "/submit"],
  ["For Vendors", "/for-vendors"],
] as const;
export function Header({
  accountLinks = guestNavigation,
}: {
  accountLinks?: AccountNavigation;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (reduced) dialog.current?.close();
  }, [open, reduced]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [open]);
  return (
    <header className="site-header">
      <div className="container flex h-24 items-center justify-between gap-6">
        <Link href="/" aria-label="aiBean home" className="logo-link">
          <Logo />
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || path.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
              className="nav-link"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search aiBean"
            className="icon-button"
          >
            <Search size={20} />
          </Link>
          {accountLinks
            .filter(
              (link) =>
                link.href === "/account" ||
                link.href === "/admin" ||
                link.href === "/register" ||
                link.href === "/login",
            )
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  ["/register", "/admin"].includes(link.href)
                    ? "nav-link hidden md:inline-flex whitespace-nowrap"
                    : "button primary"
                }
              >
                {link.label}
              </Link>
            ))}
          {accountLinks.some((link) =>
            ["/creator", "/vendor"].includes(link.href),
          ) && (
            <details className="relative hidden md:block">
              <summary className="nav-link cursor-pointer">Workspaces</summary>
              <nav
                aria-label="Account workspaces"
                className="placeholder-card absolute right-0 top-full z-50 mt-3 flex min-w-56 flex-col gap-4"
              >
                {accountLinks
                  .filter((link) => ["/creator", "/vendor"].includes(link.href))
                  .map((link) => (
                    <Link key={link.href} href={link.href} className="nav-link">
                      {link.label}
                    </Link>
                  ))}
              </nav>
            </details>
          )}
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="icon-button menu-toggle"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
        </div>
      </div>
      <motion.dialog
        ref={dialog}
        id="mobile-navigation"
        aria-label="Navigation menu"
        className="mobile-menu"
        // Keep server HTML and the first client render identical regardless of
        // the browser's reduced-motion preference. Animate only after mounting.
        initial={{ x: 0 }}
        animate={{ x: open || reduced ? 0 : "100%" }}
        transition={reduced ? { duration: 0 } : EXPLORATION_SPRING}
        onAnimationComplete={() => {
          if (!open) dialog.current?.close();
        }}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl font-bold">
            Your next move.
          </span>
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="mt-8 flex flex-col gap-5"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-xl"
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link href="/playbooks" onClick={() => setOpen(false)}>
            Playbooks
          </Link>
          <Link href="/industries" onClick={() => setOpen(false)}>
            AI for Your Business
          </Link>
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xl"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </motion.dialog>
    </header>
  );
}
