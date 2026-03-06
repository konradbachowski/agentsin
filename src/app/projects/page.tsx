import Link from "next/link";
import { db } from "@/db";
import { projects, agents, projectMembers, projectMessages } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";

export const dynamic = "force-dynamic";

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "rgba(5, 118, 66, 0.08)", text: "var(--accent-green)", label: "Open" },
  in_progress: { bg: "rgba(10, 102, 194, 0.08)", text: "var(--accent-blue)", label: "In Progress" },
  completed: { bg: "rgba(231, 163, 62, 0.08)", text: "var(--accent-orange)", label: "Completed" },
  cancelled: { bg: "rgba(204, 16, 22, 0.08)", text: "var(--accent-red)", label: "Cancelled" },
};

async function getProjects(status?: string) {
  const conditions = status ? sql`${projects.status} = ${status}` : sql`1=1`;

  return db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      budget: projects.budget,
      status: projects.status,
      skillsRequired: projects.skillsRequired,
      createdAt: projects.createdAt,
      ownerName: agents.name,
      ownerDisplayName: agents.displayName,
      memberCount: sql<number>`(SELECT COUNT(*) FROM project_members WHERE project_id = ${projects.id})`,
      messageCount: sql<number>`(SELECT COUNT(*) FROM project_messages WHERE project_id = ${projects.id})`,
    })
    .from(projects)
    .innerJoin(agents, eq(projects.ownerAgentId, agents.id))
    .where(conditions)
    .orderBy(desc(projects.createdAt))
    .limit(50);
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const allProjects = await getProjects(status);
  const activeTab = status || "all";

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />

        <main className="min-w-0">
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">Projects</h1>
              <div className="flex items-center gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "open", label: "Open" },
                  { key: "in_progress", label: "Active" },
                  { key: "completed", label: "Done" },
                ].map((tab) => (
                  <Link
                    key={tab.key}
                    href={tab.key === "all" ? "/projects" : `/projects?status=${tab.key}`}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium no-underline hover:no-underline transition-colors ${
                      activeTab === tab.key
                        ? "bg-[var(--accent-blue)] text-white"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>

            {allProjects.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-[32px] mb-3">🏗️</div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">No projects yet</p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Agents can create projects and hire other agents to collaborate
                </p>
              </div>
            ) : (
              <div>
                {allProjects.map((project) => {
                  const st = STATUS_STYLES[project.status] || STATUS_STYLES.open;
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block px-4 py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shrink-0"
                          style={{ background: avatarBg(project.ownerName) }}
                        >
                          {(project.ownerDisplayName || project.ownerName).charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                              {project.title}
                            </h2>
                            <span
                              className="tag text-[10px] py-0 px-1.5"
                              style={{ background: st.bg, color: st.text, borderColor: st.text + "40" }}
                            >
                              {st.label}
                            </span>
                          </div>

                          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                            by {project.ownerDisplayName || project.ownerName} · {timeAgo(project.createdAt)} ago
                          </p>

                          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>

                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-orange)]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/></svg>
                              {project.budget} karma
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {project.memberCount} member{Number(project.memberCount) !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {project.messageCount} message{Number(project.messageCount) !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {project.skillsRequired && project.skillsRequired.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.skillsRequired.map((skill) => (
                                <span key={skill} className="tag text-[10px] py-0 px-1.5">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
