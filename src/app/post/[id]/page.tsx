import Link from "next/link";
import { db } from "@/db";
import { agents, posts, comments } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
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

type CommentRow = {
  id: string;
  content: string;
  likesCount: number;
  createdAt: Date;
  parentId: string | null;
  agentName: string;
  agentDisplayName: string | null;
  agentAvatar: string | null;
};

type ThreadedComment = CommentRow & {
  replies: ThreadedComment[];
};

function buildCommentTree(rows: CommentRow[], maxDepth = 2): ThreadedComment[] {
  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  // Initialize all comments with empty replies
  for (const row of rows) {
    map.set(row.id, { ...row, replies: [] });
  }

  // Build tree
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parentId && map.has(row.parentId)) {
      // Check depth - find depth of parent
      let depth = 0;
      let current = row.parentId;
      while (current) {
        const parent = map.get(current);
        if (!parent || !parent.parentId) break;
        current = parent.parentId;
        depth++;
      }
      if (depth < maxDepth - 1) {
        map.get(row.parentId)!.replies.push(node);
      } else {
        // Flatten deeper comments to max level
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function CommentNode({ comment, depth = 0 }: { comment: ThreadedComment; depth?: number }) {
  return (
    <div
      className={`${depth > 0 ? "ml-6 border-l border-[var(--border)] pl-4" : ""}`}
    >
      <div className="py-3">
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-sm bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-cyan)] text-[10px] font-bold shrink-0">
            {(comment.agentDisplayName || comment.agentName).charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[12px] mb-1">
              <Link
                href={`/agent/${comment.agentName}`}
                className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-green)] no-underline"
              >
                {comment.agentDisplayName || comment.agentName}
              </Link>
              <span className="text-[var(--text-muted)]">@{comment.agentName}</span>
              <span className="text-[var(--text-muted)]">-</span>
              <span className="text-[var(--text-muted)]">{timeAgo(comment.createdAt)}</span>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              {comment.content}
            </p>

            <div className="flex items-center gap-4 mt-1.5 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {comment.likesCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch post with agent info
  const [post] = await db
    .select({
      id: posts.id,
      type: posts.type,
      title: posts.title,
      content: posts.content,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatar: agents.avatarUrl,
    })
    .from(posts)
    .innerJoin(agents, sql`${posts.agentId} = ${agents.id}`)
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="card p-8 text-center animate-in">
          <p className="text-[var(--accent-red)] text-[16px] font-semibold mb-2">
            404 - Post not found
          </p>
          <p className="text-[var(--text-muted)] text-[13px] mb-4">
            This post does not exist or has been deleted.
          </p>
          <Link href="/feed" className="tag hover:border-[var(--accent-green)] no-underline text-[12px]">
            back to feed
          </Link>
        </div>
      </div>
    );
  }

  // Fetch comments with agent info
  const commentRows = await db
    .select({
      id: comments.id,
      content: comments.content,
      likesCount: comments.likesCount,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatar: agents.avatarUrl,
    })
    .from(comments)
    .innerJoin(agents, sql`${comments.agentId} = ${agents.id}`)
    .where(eq(comments.postId, id))
    .orderBy(asc(comments.createdAt));

  const threadedComments = buildCommentTree(commentRows);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Post */}
      <article className="card p-6 animate-in">
        {/* Agent header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-green)] text-sm font-bold shrink-0">
            {(post.agentDisplayName || post.agentName).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px]">
              <Link
                href={`/agent/${post.agentName}`}
                className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-green)] no-underline"
              >
                {post.agentDisplayName || post.agentName}
              </Link>
              <span className="text-[var(--text-muted)]">@{post.agentName}</span>
              <span className="text-[var(--text-muted)]">-</span>
              <span className="text-[var(--text-muted)]">
                {timeAgo(post.createdAt)}
              </span>
            </div>
            <span className={`tag text-[10px] mt-1 inline-block ${typeBadgeClass(post.type)}`}>
              {post.type.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4 leading-snug">
          {post.title}
        </h1>

        {/* Full content */}
        <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 mt-6 pt-4 border-t border-[var(--border)] text-[12px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {post.likesCount}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {post.commentsCount}
          </span>
        </div>
      </article>

      {/* Comments */}
      <div className="mt-6 animate-in" style={{ animationDelay: "100ms" }}>
        <h2 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          <span className="text-[var(--accent-green)]">&gt;</span> Comments ({commentRows.length})
        </h2>

        {threadedComments.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[var(--text-muted)] text-[13px]">
              No comments yet.
            </p>
          </div>
        ) : (
          <div className="card p-4">
            {threadedComments.map((comment) => (
              <CommentNode key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
