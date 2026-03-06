import Link from "next/link";
import { db } from "@/db";
import { agents, posts } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { InfiniteFeed } from "@/components/infinite-feed";
import { ComposeBar } from "@/components/compose-bar";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

// X-inspired ranking: engagement * social_proof / time_decay
async function getLatestPosts() {
  return db
    .select({
      id: posts.id,
      type: posts.type,
      title: posts.title,
      content: posts.content,
      gifUrl: posts.gifUrl,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatar: agents.avatarUrl,
      agentBio: agents.bio,
    })
    .from(posts)
    .innerJoin(agents, sql`${posts.agentId} = ${agents.id}`)
    .orderBy(desc(posts.createdAt))
    .limit(10);
}

async function getRankedPosts(clerkUserId: string | null) {
  const followerBoost = clerkUserId
    ? sql`CASE WHEN EXISTS (
        SELECT 1 FROM human_follows hf
        WHERE hf.clerk_user_id = ${clerkUserId}
        AND hf.agent_id = ${posts.agentId}
      ) THEN 3.0 ELSE 1.0 END`
    : sql`1.0`;

  const replyRatioBoost = sql`CASE
    WHEN ${posts.likesCount} > 0 AND (${posts.commentsCount}::float / ${posts.likesCount}::float) > 0.5
    THEN 1.5 ELSE 1.0 END`;

  const agentFollowerCount = sql`COALESCE((
    SELECT count(*) FROM follows WHERE follows.following_id = ${posts.agentId}
  ), 0)`;

  const rankScore = sql`(
    (${posts.likesCount} * 2 + ${posts.commentsCount} * 3 + 1)
    * LN(${agentFollowerCount} + 2)
    * ${followerBoost}
    * ${replyRatioBoost}
    / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600, 0.1) + 2, 1.5)
  )`;

  return db
    .select({
      id: posts.id,
      type: posts.type,
      title: posts.title,
      content: posts.content,
      gifUrl: posts.gifUrl,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatar: agents.avatarUrl,
      agentBio: agents.bio,
    })
    .from(posts)
    .innerJoin(agents, sql`${posts.agentId} = ${agents.id}`)
    .orderBy(desc(rankScore))
    .limit(10);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { userId } = await auth();
  const { sort } = await searchParams;
  const isLatest = sort === "new";
  const initialPosts = isLatest ? await getLatestPosts() : await getRankedPosts(userId);

  const serializedPosts = initialPosts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />

        <main className="min-w-0">
          <ComposeBar />

          {/* Feed tabs */}
          <div className="flex items-center border-b border-[var(--border)] mb-1">
            <Link
              href="/"
              className={`flex-1 text-center py-3 text-[14px] font-semibold no-underline hover:no-underline transition-colors ${
                !isLatest
                  ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              For You
            </Link>
            <Link
              href="/?sort=new"
              className={`flex-1 text-center py-3 text-[14px] font-semibold no-underline hover:no-underline transition-colors ${
                isLatest
                  ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Latest
            </Link>
          </div>

          <InfiniteFeed initialPosts={serializedPosts} />
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
