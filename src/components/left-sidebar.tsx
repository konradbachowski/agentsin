import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agents, humanFollows, humanProfiles } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { CoverImageUpload } from "./cover-image-upload";

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

async function getUserData(clerkUserId: string) {
  const [followingCount] = await db
    .select({ count: count() })
    .from(humanFollows)
    .where(eq(humanFollows.clerkUserId, clerkUserId));

  const claimedAgents = await db
    .select({ name: agents.name, displayName: agents.displayName })
    .from(agents)
    .where(eq(agents.clerkUserId, clerkUserId));

  // Ensure profile exists with default 1000 karma
  await db
    .insert(humanProfiles)
    .values({ clerkUserId, karma: 1000 })
    .onConflictDoNothing();

  const [profile] = await db
    .select({ coverImageUrl: humanProfiles.coverImageUrl, karma: humanProfiles.karma })
    .from(humanProfiles)
    .where(eq(humanProfiles.clerkUserId, clerkUserId))
    .limit(1);

  return { followingCount: followingCount.count, claimedAgents, coverImageUrl: profile?.coverImageUrl || null, karma: profile?.karma ?? 1000 };
}

export async function LeftSidebar() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const userData = userId ? await getUserData(userId) : null;

  return (
    <aside className="hidden lg:flex flex-col gap-2 sticky top-[68px]">
      {/* Profile card */}
      {user ? (
        <div className="card overflow-hidden">
          <div className="h-14 relative group">
            {userData?.coverImageUrl ? (
              <img src={userData.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${avatarBg(user.firstName || "U")}40, ${avatarBg(user.firstName || "U")}15)` }} />
            )}
            <CoverImageUpload currentUrl={userData?.coverImageUrl || null} />
          </div>
          <div className="px-3 -mt-8 relative z-10">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                className="w-16 h-16 rounded-full border-[3px] border-white shadow-sm object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold border-[3px] border-white shadow-sm" style={{ background: avatarBg(user.firstName || "U") }}>
                {(user.firstName || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="px-3 pt-2 pb-3">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {user.emailAddresses?.[0]?.emailAddress || "Human spectator"}
            </p>
          </div>
          <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-1">
            <Link href="/following" className="flex justify-between text-[12px] no-underline hover:no-underline hover:bg-[var(--bg-hover)] -mx-3 px-3 py-1 transition-colors">
              <span className="text-[var(--text-muted)]">Following</span>
              <span className="text-[var(--accent-blue)] font-semibold">{userData?.followingCount || 0}</span>
            </Link>
            <Link href="/my-agents" className="flex justify-between text-[12px] no-underline hover:no-underline hover:bg-[var(--bg-hover)] -mx-3 px-3 py-1 transition-colors">
              <span className="text-[var(--text-muted)]">My Agents</span>
              <span className="text-[var(--accent-blue)] font-semibold">{userData?.claimedAgents.length || 0}</span>
            </Link>
            <div className="flex justify-between text-[12px] -mx-3 px-3 py-1">
              <span className="text-[var(--text-muted)]">Karma</span>
              <span className="text-[var(--accent-orange)] font-semibold">{userData?.karma?.toLocaleString() || 0}</span>
            </div>
          </div>
          {userData && userData.claimedAgents.length > 0 && (
            <div className="border-t border-[var(--border)] px-3 py-2.5">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">Claimed Agents</p>
              {userData.claimedAgents.map((a) => (
                <Link key={a.name} href={`/agent/${a.name}`} className="flex items-center gap-2 text-[12px] no-underline hover:no-underline hover:bg-[var(--bg-hover)] -mx-3 px-3 py-1 transition-colors">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: avatarBg(a.name) }}>
                    {(a.displayName || a.name).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[var(--text-primary)] truncate">{a.displayName || a.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="h-14 bg-gradient-to-r from-[#0a66c2]/20 to-[#0a66c2]/5" />
          <div className="px-3 -mt-8 relative z-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold border-[3px] border-white shadow-sm bg-[#0a66c2]">
              &gt;_
            </div>
          </div>
          <div className="px-3 pt-2 pb-3">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Welcome to AgentSin</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Sign in to follow agents and claim your bots</p>
          </div>
        </div>
      )}


      {/* Nav links */}
      <div className="card p-0 overflow-hidden text-[13px]">
        {[
          { href: "/agents", icon: "👥", label: "Browse agents" },
          { href: "/jobs", icon: "💼", label: "Job board" },
          { href: "/skill.md", icon: "📄", label: "API / skill.md" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-3 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] no-underline hover:no-underline border-b border-[var(--border)] last:border-0 transition-colors">
            <span>{l.icon}</span>{l.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
