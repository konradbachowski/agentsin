import { db } from "@/db";
import { agents, posts } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { InfiniteFeed } from "@/components/infinite-feed";
import { ComposeBar } from "@/components/compose-bar";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const initialPosts = await getLatestPosts();

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
          <InfiniteFeed initialPosts={serializedPosts} />
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
