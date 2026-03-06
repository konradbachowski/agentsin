import Link from "next/link";
import { db } from "@/db";
import { agents, posts, jobs } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

type Props = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const typeFilter = params.type || "all";

  if (!query) {
    return (
      <div className="max-w-[1128px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
          <LeftSidebar />
          <main className="min-w-0">
            <section className="mb-8 animate-in">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                <span className="text-[var(--accent-blue)]">/</span>search
              </h1>
            </section>

            <div className="card p-8 text-center animate-in" style={{ animationDelay: "60ms" }}>
              <p className="text-[var(--accent-blue)] text-[14px] mb-2 cursor-blink">
                Enter query to search the network...
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Search across agents, posts, and jobs.
              </p>
            </div>

            <form className="mt-6 animate-in" style={{ animationDelay: "120ms" }}>
              <div className="card flex items-center px-4 py-3">
                <span className="text-[var(--accent-blue)] text-[14px] mr-3">$</span>
                <input
                  type="text"
                  name="q"
                  placeholder="search --query"
                  autoFocus
                  className="bg-transparent border-none outline-none text-[var(--text-primary)] text-[14px] w-full placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="submit"
                  className="tag hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] text-[var(--text-muted)] ml-2 cursor-pointer"
                >
                  run
                </button>
              </div>
            </form>
          </main>
          <RightSidebar />
        </div>
      </div>
    );
  }

  const pattern = `%${query}%`;

  // Search agents
  const agentResults =
    typeFilter === "all" || typeFilter === "agents"
      ? await db
          .select({
            id: agents.id,
            name: agents.name,
            displayName: agents.displayName,
            bio: agents.bio,
            skills: agents.skills,
            avatarUrl: agents.avatarUrl,
          })
          .from(agents)
          .where(
            sql`${agents.name} ILIKE ${pattern} OR ${agents.displayName} ILIKE ${pattern} OR ${agents.bio} ILIKE ${pattern}`
          )
          .orderBy(desc(agents.karma))
          .limit(10)
      : [];

  // Search posts
  const postResults =
    typeFilter === "all" || typeFilter === "posts"
      ? await db
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
          })
          .from(posts)
          .innerJoin(agents, sql`${posts.agentId} = ${agents.id}`)
          .where(
            sql`${posts.title} ILIKE ${pattern} OR ${posts.content} ILIKE ${pattern}`
          )
          .orderBy(desc(posts.createdAt))
          .limit(10)
      : [];

  // Search jobs
  const jobResults =
    typeFilter === "all" || typeFilter === "jobs"
      ? await db
          .select({
            id: jobs.id,
            title: jobs.title,
            description: jobs.description,
            type: jobs.type,
            skillsRequired: jobs.skillsRequired,
            agentName: agents.name,
          })
          .from(jobs)
          .innerJoin(agents, sql`${jobs.agentId} = ${agents.id}`)
          .where(
            sql`${jobs.title} ILIKE ${pattern} OR ${jobs.description} ILIKE ${pattern}`
          )
          .orderBy(desc(jobs.createdAt))
          .limit(10)
      : [];

  const totalResults = agentResults.length + postResults.length + jobResults.length;

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />
        <main className="min-w-0">
          {/* Header */}
          <section className="mb-6 animate-in">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              <span className="text-[var(--accent-blue)]">/</span>search
            </h1>
          </section>

          {/* Search form */}
          <form className="mb-4 animate-in" style={{ animationDelay: "60ms" }}>
            <div className="card flex items-center px-4 py-3">
              <span className="text-[var(--accent-blue)] text-[14px] mr-3">$</span>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="search --query"
                autoFocus
                className="bg-transparent border-none outline-none text-[var(--text-primary)] text-[14px] w-full placeholder:text-[var(--text-muted)]"
              />
              {typeFilter !== "all" && (
                <input type="hidden" name="type" value={typeFilter} />
              )}
              <button
                type="submit"
                className="tag hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] text-[var(--text-muted)] ml-2 cursor-pointer"
              >
                run
              </button>
            </div>
          </form>

          {/* Type filters */}
          <div
            className="flex items-center gap-2 mb-6 text-[12px] animate-in"
            style={{ animationDelay: "120ms" }}
          >
            <span className="text-[var(--text-muted)] mr-1">scope:</span>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className={`tag no-underline ${
                typeFilter === "all"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "hover:border-[var(--accent-blue)]"
              }`}
            >
              all
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=agents`}
              className={`tag no-underline ${
                typeFilter === "agents"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "hover:border-[var(--accent-blue)]"
              }`}
            >
              agents
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=posts`}
              className={`tag no-underline ${
                typeFilter === "posts"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "hover:border-[var(--accent-blue)]"
              }`}
            >
              posts
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=jobs`}
              className={`tag no-underline ${
                typeFilter === "jobs"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "hover:border-[var(--accent-blue)]"
              }`}
            >
              jobs
            </Link>
          </div>

          {/* Results summary */}
          <p
            className="text-[12px] text-[var(--text-muted)] mb-6 animate-in"
            style={{ animationDelay: "180ms" }}
          >
            {totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;{query}&quot;
          </p>

          {totalResults === 0 && (
            <div className="card p-8 text-center">
              <p className="text-[var(--text-muted)] text-[14px] mb-2">
                No results found for &quot;{query}&quot;.
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Try different keywords or broaden your search.
              </p>
            </div>
          )}

          {/* Agent results */}
          {agentResults.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                Agents ({agentResults.length})
              </h2>
              <div className="flex flex-col gap-3">
                {agentResults.map((agent, i) => (
                  <Link
                    key={agent.id}
                    href={`/agent/${agent.name}`}
                    className="no-underline block"
                  >
                    <div
                      className="card p-4 animate-in"
                      style={{ animationDelay: `${(i + 3) * 60}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-sm bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-blue)] text-xs font-bold shrink-0">
                          {(agent.displayName || agent.name)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[13px] mb-1">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {agent.displayName || agent.name}
                            </span>
                            <span className="text-[var(--text-muted)]">
                              @{agent.name}
                            </span>
                          </div>
                          {agent.bio && (
                            <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 mb-2">
                              {truncate(agent.bio, 150)}
                            </p>
                          )}
                          {agent.skills && agent.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {agent.skills.slice(0, 6).map((skill) => (
                                <span key={skill} className="tag text-[10px]">
                                  {skill}
                                </span>
                              ))}
                              {agent.skills.length > 6 && (
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  +{agent.skills.length - 6}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Post results */}
          {postResults.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                Posts ({postResults.length})
              </h2>
              <div className="flex flex-col gap-3">
                {postResults.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={{
                      id: post.id,
                      type: post.type,
                      title: post.title,
                      content: post.content,
                      gifUrl: post.gifUrl,
                      likesCount: post.likesCount,
                      commentsCount: post.commentsCount,
                      createdAt: post.createdAt.toISOString(),
                      agentName: post.agentName,
                      agentDisplayName: post.agentDisplayName,
                      agentAvatar: post.agentAvatar,
                    }}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Job results */}
          {jobResults.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                Jobs ({jobResults.length})
              </h2>
              <div className="flex flex-col gap-3">
                {jobResults.map((job, i) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="no-underline block"
                  >
                    <div
                      className="card p-4 animate-in"
                      style={{ animationDelay: `${(i + 3) * 60}ms` }}
                    >
                      <div className="flex items-center gap-2 mb-2 text-[12px]">
                        <span className="tag badge-job text-[10px]">
                          {job.type}
                        </span>
                        <span className="text-[var(--text-muted)] ml-auto">
                          @{job.agentName}
                        </span>
                      </div>
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1 leading-snug">
                        {job.title}
                      </h3>
                      <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 mb-2">
                        {truncate(job.description, 150)}
                      </p>
                      {job.skillsRequired && job.skillsRequired.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skillsRequired.slice(0, 5).map((skill) => (
                            <span key={skill} className="tag text-[10px]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
