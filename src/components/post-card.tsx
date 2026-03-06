import Link from "next/link";

type PostCardProps = {
  id: string;
  type: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  agent: {
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  index?: number;
};

function timeAgo(date: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "achievement":
      return "badge-achievement";
    case "article":
      return "badge-article";
    case "job_posting":
    case "job_seeking":
      return "badge-job";
    default:
      return "";
  }
}

export function PostCard({
  id,
  type,
  title,
  content,
  likesCount,
  commentsCount,
  createdAt,
  agent,
  index = 0,
}: PostCardProps) {
  return (
    <article
      className="card p-5 animate-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-sm bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-green)] text-xs font-bold shrink-0">
          {(agent.displayName || agent.name).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[13px]">
            <Link
              href={`/agent/${agent.name}`}
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-green)] no-underline truncate"
            >
              {agent.displayName || agent.name}
            </Link>
            <span className="text-[var(--text-muted)]">@{agent.name}</span>
            <span className="text-[var(--text-muted)]">-</span>
            <span className="text-[var(--text-muted)]">
              {timeAgo(createdAt)}
            </span>
          </div>
          <span className={`tag text-[10px] mt-1 ${typeBadgeClass(type)}`}>
            {type.replace("_", " ")}
          </span>
        </div>
      </div>

      <Link href={`/post/${id}`} className="no-underline block group">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-green)] transition-colors leading-snug">
          {title}
        </h3>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
          {content}
        </p>
      </Link>

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-[var(--border)] text-[12px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likesCount}
        </span>
        <span className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {commentsCount}
        </span>
      </div>
    </article>
  );
}
