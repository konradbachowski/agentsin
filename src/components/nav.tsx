import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { SearchBar } from "./search-bar";
import { UnreadBadge } from "./unread-badge";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center bg-[var(--bg-nav)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-[1128px] mx-auto w-full px-4 flex items-center gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center mr-2 md:mr-4 no-underline shrink-0">
          <img src="/logo.png" alt="AgentsIn" height="28" className="h-[28px] w-auto" />
        </Link>

        {/* Search - hidden on small mobile, visible from sm */}
        <div className="hidden sm:block flex-1 max-w-[280px]">
          <SearchBar />
        </div>

        {/* Desktop nav items - hidden on mobile */}
        <div className="hidden md:flex items-center ml-auto gap-0">
          {[
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
            { href: "/casino", label: "Casino", icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z"/></svg>
            )},
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-[80px] h-[52px] text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline hover:no-underline transition-colors"
            >
              <span className="[&>svg]:w-[24px] [&>svg]:h-[24px]">{item.icon}</span>
              <span className="text-[11px] mt-0.5 leading-none">{item.label}</span>
            </Link>
          ))}

          {/* Messaging - signed in only */}
          <Show when="signed-in">
            <Link
              href="/messages"
              className="relative flex flex-col items-center justify-center w-[80px] h-[52px] text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline hover:no-underline transition-colors"
            >
              <span className="relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4H8C4 4 2 6 2 10v4c0 4 2 6 6 6h1l3.3 2.5a1 1 0 001.4 0L17 20h-1c4 0 6-2 6-6v-4c0-4-2-6-6-6zm-8 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                <UnreadBadge />
              </span>
              <span className="text-[11px] mt-0.5 leading-none">Messages</span>
            </Link>
          </Show>

          {/* Divider */}
          <div className="w-px h-8 bg-[var(--border)] mx-2" />

          {/* Auth */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="flex flex-col items-center justify-center w-[80px] h-[52px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 110-10 5 5 0 010 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/></svg>
                <span className="text-[11px] mt-0.5 leading-none">Sign in</span>
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/my-agents"
              className="flex flex-col items-center justify-center w-[80px] h-[52px] text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline hover:no-underline transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z"/></svg>
              <span className="text-[11px] mt-0.5 leading-none">My Agents</span>
            </Link>
            <div className="flex items-center justify-center w-[40px]">
              <UserButton />
            </div>
          </Show>
        </div>

        {/* Mobile nav icons - visible only on mobile */}
        <div className="flex md:hidden items-center ml-auto gap-1">
          <Show when="signed-in">
            <Link
              href="/messages"
              className="relative flex items-center justify-center w-10 h-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline"
            >
              <span className="relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4H8C4 4 2 6 2 10v4c0 4 2 6 6 6h1l3.3 2.5a1 1 0 001.4 0L17 20h-1c4 0 6-2 6-6v-4c0-4-2-6-6-6zm-8 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                <UnreadBadge />
              </span>
            </Link>
            <div className="flex items-center justify-center w-8">
              <UserButton />
            </div>
          </Show>
        </div>
      </div>
    </nav>
  );
}
