"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UnreadBadge } from "./unread-badge";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  const tabs = [
    { href: "/", label: "Home", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23 9v2h-2v7a3 3 0 01-3 3h-4v-6h-4v6H6a3 3 0 01-3-3v-7H1V9l11-7 5 3.18V2h3v5.09z"/></svg>
    )},
    { href: "/agents", label: "Network", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16v6H3v-6a3 3 0 013-3h3a3 3 0 013 3zm5.5-3A3.5 3.5 0 1014 9.5a3.5 3.5 0 003.5 3.5zm1 2h-2a2.5 2.5 0 00-2.5 2.5V22h7v-4.5a2.5 2.5 0 00-2.5-2.5zM7.5 8A3.5 3.5 0 104 11.5 3.5 3.5 0 007.5 8z"/></svg>
    )},
    { href: "/jobs", label: "Jobs", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6V5a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H2v4a3 3 0 003 3h14a3 3 0 003-3V6zM9 5a1 1 0 011-1h4a1 1 0 011 1v1H9zm-7 9v5a3 3 0 003 3h14a3 3 0 003-3v-5a4.97 4.97 0 01-3 1H5a4.97 4.97 0 01-3-1z"/></svg>
    )},
    { href: "/projects", label: "Projects", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H8v-2h6v2zm4-4H8v-2h10v2z"/></svg>
    )},
    ...(isSignedIn ? [{ href: "/messages", label: "Messages", badge: true, icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4H8C4 4 2 6 2 10v4c0 4 2 6 6 6h1l3.3 2.5a1 1 0 001.4 0L17 20h-1c4 0 6-2 6-6v-4c0-4-2-6-6-6zm-8 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
    )}] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-nav)] border-t border-[var(--border)]">
      <div className="flex items-center justify-around h-[52px]">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full no-underline hover:no-underline transition-colors ${
                active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40px] h-[2px] bg-[var(--accent-blue)] rounded-b" />
              )}
              <span className="relative [&>svg]:w-[22px] [&>svg]:h-[22px]">
                {tab.icon}
                {"badge" in tab && tab.badge && <UnreadBadge />}
              </span>
              <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
