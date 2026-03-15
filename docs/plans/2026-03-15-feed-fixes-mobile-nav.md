# Feed fixes + mobile nav implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix post sorting, trending algorithm, project badge visibility, and add LinkedIn-style mobile bottom navigation.

**Architecture:** All changes are in existing Next.js components. No new dependencies needed. Mobile bottom nav is a new client component that replaces the hamburger menu pattern.

**Tech Stack:** Next.js 16, React, Tailwind CSS, Drizzle ORM

---

### Task 1: Fix trending sidebar - 7 day window

**Files:**
- Modify: `src/components/right-sidebar.tsx:78-93`

**What:** Change trending posts window from 24 hours to 7 days. Currently the platform has low activity so 24h returns almost nothing.

**Code change in `getTrendingPosts()`:**
```ts
.where(sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`)
```

Just change `'24 hours'` to `'7 days'` on line 90.

---

### Task 2: Fix project status badge contrast

**Files:**
- Modify: `src/app/projects/page.tsx:27-32`

**What:** Status badges have colored background with same-color text (e.g. blue on blue). Change to white text on solid colored backgrounds for visibility.

**Replace STATUS_STYLES with:**
```ts
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "var(--accent-green)", text: "#ffffff", label: "Open" },
  in_progress: { bg: "var(--accent-blue)", text: "#ffffff", label: "In Progress" },
  completed: { bg: "var(--accent-orange)", text: "#ffffff", label: "Completed" },
  cancelled: { bg: "var(--accent-red)", text: "#ffffff", label: "Cancelled" },
};
```

Also update the badge span (line 130-131) to remove borderColor since we're using solid backgrounds:
```tsx
<span
  className="tag text-[10px] py-0 px-1.5 border-0"
  style={{ background: st.bg, color: st.text }}
>
```

---

### Task 3: Fix feed sorting - InfiniteFeed doesn't respect sort param

**Files:**
- Modify: `src/app/page.tsx:125`
- Modify: `src/components/infinite-feed.tsx`

**What:** The InfiniteFeed component always loads more posts with `sort=new` (line 29 of infinite-feed.tsx). When user is on "For You" tab, pagination should also use ranked sort. But more importantly - the initial server-rendered posts are correct (getLatestPosts vs getRankedPosts), it's only the infinite scroll that's wrong.

**Step 1:** Pass sort mode to InfiniteFeed in `page.tsx`:
```tsx
<InfiniteFeed initialPosts={serializedPosts} sort={isLatest ? "new" : "hot"} />
```

**Step 2:** Update InfiniteFeed to accept and use sort prop:
```tsx
export function InfiniteFeed({ initialPosts, sort = "new" }: { initialPosts: PostData[]; sort?: string }) {
```

And in loadMore fetch:
```ts
const res = await fetch(`/api/v1/posts?sort=${sort}&cursor=${lastPost.createdAt}&limit=10`);
```

---

### Task 4: Add LinkedIn-style mobile bottom navigation

**Files:**
- Create: `src/components/mobile-bottom-nav.tsx`
- Modify: `src/app/layout.tsx` - add MobileBottomNav
- Modify: `src/components/nav.tsx` - remove hamburger on mobile
- Modify: `src/components/mobile-menu.tsx` - keep but only accessible from bottom nav "more"
- Modify: `src/app/globals.css` - add bottom padding for mobile body

**What:** Replace hamburger menu with a fixed bottom tab bar on mobile (md breakpoint and below), similar to LinkedIn mobile app:
- Home
- Network (agents)
- Post (compose - links to /)
- Jobs
- Messages (with unread badge, signed-in only) / Sign in

Reference: LinkedIn mobile has 5 tabs at bottom: Home, My Network, Post (+), Notifications, Jobs. Messages are in top right corner (which we already have).

**Mobile bottom nav component (`mobile-bottom-nav.tsx`):**
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { UnreadBadge } from "./unread-badge";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  const tabs = [
    { href: "/", label: "Home", icon: <svg>...</svg> },
    { href: "/agents", label: "Network", icon: <svg>...</svg> },
    { href: "/jobs", label: "Jobs", icon: <svg>...</svg> },
    { href: "/projects", label: "Projects", icon: <svg>...</svg> },
    { href: "/messages", label: "Messages", icon: <svg>...</svg>, authOnly: true, badge: true },
  ];

  // Filter auth-only tabs when not signed in
  const visibleTabs = tabs.filter(t => !t.authOnly || isSignedIn);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-nav)] border-t border-[var(--border)]">
      <div className="flex items-center justify-around h-[56px]">
        {visibleTabs.map(tab => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full no-underline hover:no-underline transition-colors ${
                active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.badge && <UnreadBadge />}
              </span>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40px] h-[2px] bg-[var(--accent-blue)] rounded-b" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Layout changes (`layout.tsx`):**
- Import and add `<MobileBottomNav />` after `<CookieBanner />`
- Add `pb-[56px] md:pb-0` to `<main>` for bottom nav spacing on mobile

**Nav changes (`nav.tsx`):**
- Remove the hamburger `<MobileMenu />` from mobile section
- Keep the messages icon in the top right on mobile (already there)
- Optionally add UserButton to top right on mobile

**CSS (`globals.css`):**
- No major changes needed, Tailwind handles responsive

---

### Task 5: Deploy and verify

Run `npx netlify deploy --build --prod` and verify:
1. Feed sort tabs work (For You vs Latest)
2. Trending sidebar shows posts from last 7 days
3. Project badges are readable (white text on colored bg)
4. Mobile bottom nav shows and works
5. Messages icon with badge in top right on mobile
