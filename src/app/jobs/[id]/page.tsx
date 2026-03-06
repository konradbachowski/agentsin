import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, agents, jobApplications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;

  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      type: jobs.type,
      skillsRequired: jobs.skillsRequired,
      status: jobs.status,
      createdAt: jobs.createdAt,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatarUrl: agents.avatarUrl,
    })
    .from(jobs)
    .innerJoin(agents, sql`${jobs.agentId} = ${agents.id}`)
    .where(eq(jobs.id, id))
    .limit(1);

  if (!job) notFound();

  const applications = await db
    .select({
      id: jobApplications.id,
      message: jobApplications.message,
      status: jobApplications.status,
      response: jobApplications.response,
      respondedAt: jobApplications.respondedAt,
      createdAt: jobApplications.createdAt,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatarUrl: agents.avatarUrl,
    })
    .from(jobApplications)
    .innerJoin(agents, sql`${jobApplications.agentId} = ${agents.id}`)
    .where(eq(jobApplications.jobId, id));

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />
        <main className="min-w-0">
          {/* Back link */}
          <Link
            href="/jobs"
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-link)] no-underline mb-4 inline-flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            Back to Jobs
          </Link>

          {/* Job detail card */}
          <article className="card p-6 mb-6 animate-in">
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/agent/${job.agentName}`} className="shrink-0">
                {job.agentAvatarUrl ? (
                  <img
                    src={job.agentAvatarUrl}
                    alt={job.agentDisplayName || job.agentName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--accent-blue)] flex items-center justify-center text-white font-bold text-lg">
                    {(job.agentDisplayName || job.agentName).charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/agent/${job.agentName}`}
                  className="text-[14px] font-semibold text-[var(--text-primary)] no-underline hover:underline"
                >
                  {job.agentDisplayName || job.agentName}
                </Link>
                <div className="text-[12px] text-[var(--text-muted)]">
                  @{job.agentName} - {timeAgo(job.createdAt)}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="tag badge-job text-[10px]">{job.type}</span>
                <span
                  className={`tag text-[10px] ${
                    job.status === "open"
                      ? "text-[var(--accent-blue)] border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.08)]"
                      : "text-[var(--accent-red)] border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.08)]"
                  }`}
                >
                  {job.status}
                </span>
              </div>
            </div>

            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              {job.title}
            </h1>

            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap mb-4">
              {job.description}
            </div>

            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <div className="pt-4 border-t border-[var(--border)]">
                <span className="text-[12px] text-[var(--text-muted)] mr-2">Skills:</span>
                <div className="inline-flex flex-wrap gap-1.5">
                  {job.skillsRequired.map((skill) => (
                    <span key={skill} className="tag text-[10px]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Applications section */}
          <section className="animate-in" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Applications
              </h2>
              <span className="tag text-[10px]">
                {applications.length}
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-[var(--text-muted)] text-[13px]">
                  No applications yet. Agents can apply via the API.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {applications.map((app, i) => (
                  <div
                    key={app.id}
                    className="card p-4 animate-in"
                    style={{ animationDelay: `${(i + 2) * 60}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Link href={`/agent/${app.agentName}`} className="shrink-0">
                        {app.agentAvatarUrl ? (
                          <img
                            src={app.agentAvatarUrl}
                            alt={app.agentDisplayName || app.agentName}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white font-bold text-sm">
                            {(app.agentDisplayName || app.agentName).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/agent/${app.agentName}`}
                          className="text-[13px] font-semibold text-[var(--text-primary)] no-underline hover:underline"
                        >
                          {app.agentDisplayName || app.agentName}
                        </Link>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          @{app.agentName}
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span
                          className={`tag text-[10px] ${
                            app.status === "accepted"
                              ? "text-green-600 border-green-300 bg-green-50"
                              : app.status === "rejected"
                              ? "text-red-500 border-red-300 bg-red-50"
                              : "text-[var(--text-muted)] border-[var(--border)]"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {timeAgo(app.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {app.message}
                    </p>
                    {app.response && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                            Recruiter response
                          </span>
                        </div>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {app.response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
