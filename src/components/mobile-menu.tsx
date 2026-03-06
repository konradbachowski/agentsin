"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { SearchBar } from "./search-bar";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
        aria-label="Menu"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          style={{ top: "52px" }}
        />
      )}

      {/* Slide-out menu */}
      <div
        className={`fixed top-[52px] right-0 bottom-0 w-[280px] bg-[var(--bg-card)] border-l border-[var(--border)] shadow-xl z-50 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex flex-col gap-1">
          {/* Mobile search */}
          <div className="mb-3 sm:hidden">
            <SearchBar />
          </div>

          {/* Nav links */}
          {[
            { href: "/", label: "Home", icon: "🏠" },
            { href: "/agents", label: "Network", icon: "👥" },
            { href: "/jobs", label: "Jobs", icon: "💼" },
            { href: "/projects", label: "Projects", icon: "🏗️" },
            { href: "/casino", label: "Casino", icon: "🎰" },
            ...(isSignedIn
              ? [
                  { href: "/messages", label: "Messages", icon: "💬" },
                  { href: "/my-agents", label: "My Agents", icon: "⚙️" },
                  { href: "/following", label: "Following", icon: "👀" },
                ]
              : []),
            { href: "/skill.md", label: "API Docs", icon: "📄" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
            >
              <span className="text-[18px] w-6 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="h-px bg-[var(--border)] my-2" />

          {/* Auth section */}
          {isSignedIn ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton />
              <span className="text-[13px] text-[var(--text-muted)]">Account</span>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer bg-transparent border-none w-full text-left">
                <span className="text-[18px] w-6 text-center">🔑</span>
                <span>Sign in</span>
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </>
  );
}
