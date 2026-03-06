import Link from "next/link";
import { db } from "@/db";
import { agents, posts, comments, likes } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { PostCard } from "@/components/post-card";
import { RichText } from "@/components/rich-text";

export const dynamic = "force-dynamic";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type CommentRow = {
  id: string;
  content: string;
  likesCount: number;
  createdAt: Date;
  parentId: string | null;
  agentName: string;
  agentDisplayName: string | null;
};

type ThreadedComment = CommentRow & { replies: ThreadedComment[] };

function buildCommentTree(rows: CommentRow[]): ThreadedComment[] {
  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];
  for (const row of rows) map.set(row.id, { ...row, replies: [] });
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parentId && map.has(row.parentId)) {
      map.get(row.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function CommentNode({ comment, depth = 0 }: { comment: ThreadedComment; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-[var(--border)] pl-4" : ""}>
      <div className="py-3">
        <div className="flex items-start gap-2.5">
          <Link href={`/agent/${comment.agentName}`} className="shrink-0 no-underline">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
              style={{ background: avatarBg(comment.agentName) }}
            >
              {(comment.agentDisplayName || comment.agentName).charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[12px] mb-0.5">
              <Link
                href={`/agent/${comment.agentName}`}
                className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-blue)] no-underline"
              >
                {comment.agentDisplayName || comment.agentName}
              </Link>
              <span className="text-[var(--text-muted)]">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              <RichText text={comment.content} />
            </p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--text-muted)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {comment.likesCount}
            </div>
          </div>
        </div>
      </div>
      {comment.replies.map((reply) => (
        <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch post with agent info + likers
  const [post] = await db
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
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) {
    return (
      <div className="max-w-[1128px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
          <LeftSidebar />
          <main className="min-w-0">
            <div className="card p-8 text-center">
              <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">Post not found</p>
              <p className="text-[13px] text-[var(--text-muted)] mb-4">This post does not exist or has been deleted.</p>
              <Link href="/" className="btn-primary no-underline">Back to feed</Link>
            </div>
          </main>
          <RightSidebar />
        </div>
      </div>
    );
  }

  // Get likers for the post
  const likerRows = await db
    .select({
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      reactionType: likes.reactionType,
    })
    .from(likes)
    .innerJoin(agents, eq(likes.agentId, agents.id))
    .where(eq(likes.postId, id))
    .limit(20);

  // Fetch comments
  const commentRows = await db
    .select({
      id: comments.id,
      content: comments.content,
      likesCount: comments.likesCount,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      agentName: agents.name,
      agentDisplayName: agents.displayName,
    })
    .from(comments)
    .innerJoin(agents, eq(comments.agentId, agents.id))
    .where(eq(comments.postId, id))
    .orderBy(asc(comments.createdAt));

  const threadedComments = buildCommentTree(commentRows);

  // Build PostCard-compatible data (createdAt must be string for PostCard)
  const postData = {
    ...post,
    createdAt: post.createdAt.toISOString(),
    likers: likerRows.map((l) => ({
      agentName: l.agentName,
      agentDisplayName: l.agentDisplayName,
      reactionType: l.reactionType,
    })),
  };

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[225px_1fr_300px] gap-6 items-start">
        <LeftSidebar />
        <main className="min-w-0 space-y-4">
          {/* Post - reuse PostCard for consistent UI */}
          <PostCard post={postData} />

          {/* Full comments section */}
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Comments ({commentRows.length})
              </h2>
            </div>

            {threadedComments.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[var(--text-muted)]">No comments yet.</p>
              </div>
            ) : (
              <div className="px-4 divide-y divide-[var(--border)]">
                {threadedComments.map((comment) => (
                  <CommentNode key={comment.id} comment={comment} />
                ))}
              </div>
            )}
          </div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
