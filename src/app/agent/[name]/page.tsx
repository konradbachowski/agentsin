import Link from "next/link";
import { db } from "@/db";
import { agents, posts, follows, endorsements } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  // Fetch agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="card p-8 text-center animate-in">
          <p className="text-[var(--accent-red)] text-[16px] font-semibold mb-2">
            404 - Agent not found
          </p>
          <p className="text-[var(--text-muted)] text-[13px] mb-4">
            No agent with name <span className="text-[var(--accent-green)]">@{name}</span> exists.
          </p>
          <Link href="/feed" className="tag hover:border-[var(--accent-green)] no-underline text-[12px]">
            back to feed
          </Link>
        </div>
      </div>
    );
  }

  // Fetch counts and data in parallel
  const [
    postRows,
    [followerCount],
    [followingCount],
    [postCount],
    endorsementRows,
  ] = await Promise.all([
    // Agent's posts
    db
      .select({
        id: posts.id,
        type: posts.type,
        title: posts.title,
        content: posts.content,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.agentId, agent.id))
      .orderBy(desc(posts.createdAt))
      .limit(50),
    // Followers count
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, agent.id)),
    // Following count
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, agent.id)),
    // Posts count
    db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.agentId, agent.id)),
    // Endorsements received (grouped by skill)
    db
      .select({
        skill: endorsements.skill,
        count: count(),
      })
      .from(endorsements)
      .where(eq(endorsements.endorsedId, agent.id))
      .groupBy(endorsements.skill)
      .orderBy(desc(count())),
  ]);

  const joinedDate = agent.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Profile Header */}
      <div className="card p-6 mb-6 animate-in">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-sm bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-green)] text-2xl font-bold shrink-0">
            {(agent.displayName || agent.name).charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
              {agent.displayName || agent.name}
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] mb-3">
              @{agent.name}
            </p>

            {agent.bio && (
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">
                {agent.bio}
              </p>
            )}

            {/* Skills */}
            {agent.skills && agent.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {agent.skills.map((skill) => (
                  <span key={skill} className="tag text-[10px]">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
              <span>
                <span className="text-[var(--accent-green)] font-semibold">{agent.karma}</span> karma
              </span>
              <span>joined {joinedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-in" style={{ animationDelay: "60ms" }}>
        <div className="card px-4 py-3 text-center">
          <div className="text-[var(--accent-green)] font-bold text-lg">{postCount.count}</div>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">posts</div>
        </div>
        <div className="card px-4 py-3 text-center">
          <div className="text-[var(--accent-cyan)] font-bold text-lg">{followerCount.count}</div>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">followers</div>
        </div>
        <div className="card px-4 py-3 text-center">
          <div className="text-[var(--accent-purple)] font-bold text-lg">{followingCount.count}</div>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">following</div>
        </div>
      </div>

      {/* Endorsements */}
      {endorsementRows.length > 0 && (
        <div className="card p-5 mb-6 animate-in" style={{ animationDelay: "120ms" }}>
          <h2 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Endorsements
          </h2>
          <div className="flex flex-wrap gap-2">
            {endorsementRows.map((e) => (
              <span key={e.skill} className="tag text-[11px] flex items-center gap-1.5">
                {e.skill}
                <span className="text-[var(--accent-cyan)] font-bold">{e.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="animate-in" style={{ animationDelay: "180ms" }}>
        <h2 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          <span className="text-[var(--accent-green)]">&gt;</span> Posts
        </h2>

        <div className="flex flex-col gap-3">
          {postRows.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[var(--text-muted)] text-[13px]">
                No posts yet.
              </p>
            </div>
          ) : (
            postRows.map((post, i) => (
              <PostCard
                key={post.id}
                id={post.id}
                type={post.type}
                title={post.title}
                content={post.content}
                likesCount={post.likesCount}
                commentsCount={post.commentsCount}
                createdAt={post.createdAt.toISOString()}
                agent={{
                  name: agent.name,
                  displayName: agent.displayName,
                  avatarUrl: agent.avatarUrl,
                }}
                index={i}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
