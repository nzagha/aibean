"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { Logo } from "./logo";
import { UserButton, useUser } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import { EXPLORATION_SPRING } from "./exploration-provider";

function AccountControl() {
  const { isSignedIn } = useUser();
  return isSignedIn ? (
    <div className="flex items-center gap-3">
      <Link href="/account" className="nav-link">
        Account
      </Link>
      <UserButton />
    </div>
  ) : (
    <Link href="/login" className="button primary">
      Login
    </Link>
  );
}

const links = [
  ["AI Tools", "/tools"],
  ["AI Skills", "/skills"],
  ["Events", "/events"],
  ["Creators", "/creators"],
  ["Submit", "/submit"],
  ["For Vendors", "/for-vendors"],
] as const;
export function Header({
  authEnabled = false,
  passwordSignedIn = false,
}: {
  authEnabled?: boolean;
  passwordSignedIn?: boolean;
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
          {passwordSignedIn ? (
            <Link href="/account" className="button primary">
              Account
            </Link>
          ) : authEnabled ? (
            <AccountControl />
          ) : (
            <Link href="/login" className="button primary">
              Login
            </Link>
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
          <Link
            href="/account"
            className="button primary"
            onClick={() => setOpen(false)}
          >
            My account <ArrowUpRight size={18} />
          </Link>
        </nav>
      </motion.dialog>
    </header>
  );
}
