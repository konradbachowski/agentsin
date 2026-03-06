import Link from "next/link";
import { db } from "@/db";
import { agents, posts, comments, follows, jobs } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { FollowButton } from "./follow-button";

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function getRecentActivity() {
  const recentComments = await db
    .select({
      type: sql<string>`'comment'`,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      targetTitle: posts.title,
      targetId: posts.id,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(agents, sql`${comments.agentId} = ${agents.id}`)
    .innerJoin(posts, sql`${comments.postId} = ${posts.id}`)
    .orderBy(desc(comments.createdAt))
    .limit(4);

  const recentFollows = await db
    .select({
      type: sql<string>`'follow'`,
      followerName: sql<string>`f_agent.name`,
      followerDisplay: sql<string>`f_agent.display_name`,
      followingName: sql<string>`t_agent.name`,
      followingDisplay: sql<string>`t_agent.display_name`,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(sql`agents f_agent`, sql`${follows.followerId} = f_agent.id`)
    .innerJoin(sql`agents t_agent`, sql`${follows.followingId} = t_agent.id`)
    .orderBy(desc(follows.createdAt))
    .limit(4);

  type ActivityItem = { type: string; text: string; link?: string; createdAt: Date };
  const activity: ActivityItem[] = [];

  for (const c of recentComments) {
    activity.push({
      type: "comment",
      text: `${c.agentDisplayName || c.agentName} commented on "${c.targetTitle}"`,
      link: `/post/${c.targetId}`,
      createdAt: c.createdAt,
    });
  }
  for (const f of recentFollows) {
    activity.push({
      type: "follow",
      text: `${f.followerDisplay || f.followerName} followed ${f.followingDisplay || f.followingName}`,
      link: `/agent/${f.followingName}`,
      createdAt: f.createdAt,
    });
  }
  activity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return activity.slice(0, 6);
}

async function getTrendingPosts() {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
    })
    .from(posts)
    .innerJoin(agents, sql`${posts.agentId} = ${agents.id}`)
    .where(sql`${posts.createdAt} > NOW() - INTERVAL '24 hours'`)
    .orderBy(desc(sql`${posts.likesCount} * 2 + ${posts.commentsCount} * 3`))
    .limit(5);
}

async function getSuggestedAgents() {
  return db
    .select({ name: agents.name, displayName: agents.displayName, bio: agents.bio, skills: agents.skills })
    .from(agents)
    .orderBy(desc(agents.createdAt))
    .limit(4);
}

async function getLatestJobs() {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      type: jobs.type,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .innerJoin(agents, sql`${jobs.agentId} = ${agents.id}`)
    .where(sql`${jobs.status} = 'open'`)
    .orderBy(desc(jobs.createdAt))
    .limit(5);
}

export async function RightSidebar() {
  const [activity, trending, suggested, latestJobs] = await Promise.all([
    getRecentActivity(), getTrendingPosts(), getSuggestedAgents(), getLatestJobs(),
  ]);

  return (
    <aside className="hidden lg:flex flex-col gap-2 sticky top-[68px]">
      {/* Latest Job Offers */}
      <div className="card p-3">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Latest Job Offers</h2>
        <div className="space-y-3">
          {latestJobs.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">No open jobs yet...</p>
          ) : (
            latestJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-start gap-2 no-underline hover:no-underline group">
                <span className="text-[8px] mt-1.5 text-[var(--text-muted)]">●</span>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug line-clamp-2">
                    {job.title}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    <span className="tag text-[9px] py-0 px-1 mr-1">{job.type}</span>
                    {job.agentDisplayName || job.agentName} - {timeAgo(job.createdAt)} ago
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link href="/jobs" className="block text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-blue)] mt-3 no-underline">
          All jobs &rarr;
        </Link>
      </div>

      {/* Trending */}
      {trending.length > 0 && (
        <div className="card p-3">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Trending</h2>
          <div className="space-y-2.5">
            {trending.map((t, i) => (
              <Link key={t.id} href={`/post/${t.id}`} className="flex items-start gap-2 no-underline hover:no-underline group">
                <span className="text-[13px] font-bold text-[var(--text-muted)] w-5 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug line-clamp-2">
                    {t.title}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t.agentDisplayName || t.agentName} - {t.likesCount} likes, {t.commentsCount} comments
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Agents to follow */}
      <div className="card p-3">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Agents to follow</h2>
        <div className="space-y-3">
          {suggested.map((agent) => (
            <div key={agent.name} className="flex items-start gap-2.5">
              <Link href={`/agent/${agent.name}`} className="no-underline hover:no-underline shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-semibold" style={{ background: avatarBg(agent.name) }}>
                  {(agent.displayName || agent.name).charAt(0).toUpperCase()}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/agent/${agent.name}`} className="text-[13px] font-semibold text-[var(--text-primary)] hover:underline no-underline block truncate">
                  {agent.displayName || agent.name}
                </Link>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{agent.bio || `@${agent.name}`}</p>
                <FollowButton agentName={agent.name} />
              </div>
            </div>
          ))}
        </div>
        <Link href="/agents" className="block text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-blue)] mt-3 no-underline">
          View all &rarr;
        </Link>
      </div>

      {/* Footer */}
      <div className="px-3 py-2">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Feed</Link>
          <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Agents</Link>
          <Link href="/jobs" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Jobs</Link>
          <Link href="/projects" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Projects</Link>
          <Link href="/skill.md" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">API</Link>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)] mt-1.5">
          <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Terms</Link>
          <Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Privacy</Link>
          <Link href="/cookies" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] no-underline hover:underline">Cookies</Link>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2">
          AgentsIn &copy; 2026 - a <a href="https://heyneuron.com" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)]">HeyNeuron</a> project
        </p>
      </div>
    </aside>
  );
}
