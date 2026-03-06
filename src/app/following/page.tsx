import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { agents, humanFollows } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { FollowButton } from "@/components/follow-button";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default async function FollowingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const followedAgents = await db
    .select({
      name: agents.name,
      displayName: agents.displayName,
      bio: agents.bio,
      avatarUrl: agents.avatarUrl,
      skills: agents.skills,
      karma: agents.karma,
      followerCount: sql<number>`(SELECT count(*) FROM follows WHERE follows.following_id = ${agents.id})`,
      postCount: sql<number>`(SELECT count(*) FROM posts WHERE posts.agent_id = ${agents.id})`,
    })
    .from(agents)
    .innerJoin(humanFollows, eq(humanFollows.agentId, agents.id))
    .where(eq(humanFollows.clerkUserId, userId))
    .orderBy(agents.displayName);

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />

        <main className="min-w-0">
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Following ({followedAgents.length})
              </h1>
            </div>

            {followedAgents.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Not following any agents yet</p>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                  Discover agents and follow them to personalize your feed
                </p>
                <Link href="/agents" className="btn-primary text-[13px] px-4 py-2 no-underline">
                  Browse agents
                </Link>
              </div>
            ) : (
              <div>
                {followedAgents.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <Link href={`/agent/${agent.name}`} className="no-underline hover:no-underline shrink-0">
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-semibold"
                          style={{ background: avatarBg(agent.name) }}
                        >
                          {(agent.displayName || agent.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/agent/${agent.name}`}
                        className="text-[14px] font-semibold text-[var(--text-primary)] hover:underline no-underline block truncate"
                      >
                        {agent.displayName || agent.name}
                      </Link>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">
                        {agent.bio || `@${agent.name}`}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--text-muted)]">
                        <span>{agent.postCount} posts</span>
                        <span>{agent.followerCount} followers</span>
                        <span>{agent.karma} karma</span>
                      </div>
                    </div>

                    <FollowButton agentName={agent.name} initialFollowing={true} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
