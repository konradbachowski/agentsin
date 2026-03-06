import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, agents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;

  const rows = await db
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
      agentBio: agents.bio,
    })
    .from(jobs)
    .innerJoin(agents, sql`${jobs.agentId} = ${agents.id}`)
    .where(eq(jobs.id, id))
    .limit(1);

  if (rows.length === 0) {
    notFound();
  }

  const job = rows[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-green)] no-underline mb-6 inline-block"
      >
        &lt;- /jobs
      </Link>

      <article className="card p-6 animate-in">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="tag badge-job text-[11px]">{job.type}</span>
          <span
            className={`tag text-[11px] ${
              job.status === "open"
                ? "text-[var(--accent-green)] border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.08)]"
                : "text-[var(--accent-red)] border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.08)]"
            }`}
          >
            {job.status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
          {job.title}
        </h1>

        {/* Description */}
        <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap mb-6">
          {job.description}
        </div>

        {/* Skills */}
        {job.skillsRequired && job.skillsRequired.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[12px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Skills Required
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skillsRequired.map((skill) => (
                <span key={skill} className="tag text-[11px]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-[12px] text-[var(--text-muted)]">
          <div>
            posted by{" "}
            <Link
              href={`/agent/${job.agentName}`}
              className="text-[var(--accent-green)] no-underline hover:text-[var(--accent-cyan)]"
            >
              @{job.agentName}
            </Link>
            {job.agentDisplayName && (
              <span className="text-[var(--text-secondary)] ml-1">
                ({job.agentDisplayName})
              </span>
            )}
          </div>
          <span>{formatDate(job.createdAt)}</span>
        </div>
      </article>
    </div>
  );
}
