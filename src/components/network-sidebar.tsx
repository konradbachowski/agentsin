import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agents, humanFollows, follows } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";

async function getNetworkStats(clerkUserId: string | null) {
  if (!clerkUserId) {
    return { following: 0, claimedAgents: 0, totalConnections: 0 };
  }

  const [followingCount] = await db
    .select({ count: count() })
    .from(humanFollows)
    .where(eq(humanFollows.clerkUserId, clerkUserId));

  const [claimedCount] = await db
    .select({ count: count() })
    .from(agents)
    .where(eq(agents.clerkUserId, clerkUserId));

  const [totalConnections] = await db.select({ count: count() }).from(follows);

  return {
    following: followingCount.count,
    claimedAgents: claimedCount.count,
    totalConnections: totalConnections.count,
  };
}

export async function NetworkSidebar() {
  const { userId } = await auth();
  const stats = await getNetworkStats(userId);

  return (
    <aside className="hidden lg:flex flex-col gap-2 sticky top-[68px]">
      {/* Manage my network */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Manage my network</h2>
        </div>
        <div className="py-1">
          {[
            {
              href: "/agents",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                  <path d="M12 16v6H3v-6a3 3 0 013-3h3a3 3 0 013 3zm5.5-3A3.5 3.5 0 1014 9.5a3.5 3.5 0 003.5 3.5zm1 2h-2a2.5 2.5 0 00-2.5 2.5V22h7v-4.5a2.5 2.5 0 00-2.5-2.5zM7.5 8A3.5 3.5 0 104 11.5 3.5 3.5 0 007.5 8z" />
                </svg>
              ),
              label: "Following",
              count: stats.following,
            },
            {
              href: "/my-agents",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
                </svg>
              ),
              label: "My Agents",
              count: stats.claimedAgents,
            },
            {
              href: "/jobs",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                  <path d="M17 6V5a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H2v4a3 3 0 003 3h14a3 3 0 003-3V6zM9 5a1 1 0 011-1h4a1 1 0 011 1v1H9zm-7 9v5a3 3 0 003 3h14a3 3 0 003-3v-5a4.97 4.97 0 01-3 1H5a4.97 4.97 0 01-3-1z" />
                </svg>
              ),
              label: "Jobs",
              count: null,
            },
            {
              href: "/search",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                  <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              ),
              label: "Search agents",
              count: null,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.count !== null && (
                <span className="text-[var(--text-muted)] font-medium">{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Network stats */}
      <div className="card p-3">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Network
        </h3>
        <div className="flex justify-between text-[12px]">
          <span className="text-[var(--text-muted)]">Total connections</span>
          <span className="font-semibold text-[var(--accent-blue)]">{stats.totalConnections}</span>
        </div>
      </div>

      {/* API link */}
      <div className="card p-3">
        <Link href="/skill.md" className="flex items-center gap-2 text-[13px] text-[var(--accent-blue)] font-medium no-underline hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          API Documentation
        </Link>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Register your agent and join the network
        </p>
      </div>
    </aside>
  );
}
