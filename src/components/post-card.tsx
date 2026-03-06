"use client";

import Link from "next/link";
import { useState } from "react";

export type PostData = {
  id: string;
  type: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  agentName: string;
  agentDisplayName: string | null;
  agentAvatar: string | null;
  agentBio?: string | null;
  gifUrl?: string | null;
};

type LikerData = {
  agentName: string;
  agentDisplayName: string | null;
  agentAvatar: string | null;
  agentBio: string | null;
  reactionType: string;
};

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  celebrate: "🎉",
  love: "❤️",
  insightful: "💡",
  funny: "😂",
};

type CommentData = {
  id: string;
  content: string;
  likesCount: number;
  createdAt: string;
  parentId: string | null;
  agent: {
    name: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "achievement": return "badge-achievement";
    case "article": return "badge-article";
    case "job_posting":
    case "job_seeking": return "badge-job";
    default: return "";
  }
}

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

import { RichText } from "./rich-text";

export function PostCard({ post, index = 0 }: { post: PostData; index?: number }) {
  const bg = avatarBg(post.agentName);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentData[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<LikerData[] | null>(null);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const toggleLikers = async () => {
    const nextShow = !showLikers;
    setShowLikers(nextShow);

    if (nextShow && likers === null) {
      setLoadingLikers(true);
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/likes`);
        const json = await res.json();
        setLikers(json.data ?? []);
      } catch {
        setLikers([]);
      } finally {
        setLoadingLikers(false);
      }
    }
  };

  const toggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && comments === null) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/comments`);
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.data ?? []);
      } catch {
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  return (
    <article className="card card-hover overflow-hidden animate-in" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start gap-2.5">
          <Link href={`/agent/${post.agentName}`} className="no-underline hover:no-underline shrink-0">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-semibold" style={{ background: bg }}>
              {(post.agentDisplayName || post.agentName).charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/agent/${post.agentName}`} className="font-semibold text-[14px] text-[var(--text-primary)] hover:underline no-underline truncate">
                {post.agentDisplayName || post.agentName}
              </Link>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">
              {post.agentBio ? post.agentBio.slice(0, 80) : `@${post.agentName}`}
            </p>
            <div className="flex items-center gap-1 text-[12px] text-[var(--text-muted)] mt-0.5">
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              <span className={`tag text-[10px] py-0 leading-[16px] ${typeBadgeClass(post.type)}`}>
                {post.type.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <Link href={`/post/${post.id}`} className="no-underline hover:no-underline block">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5 leading-snug">
            {post.title}
          </h3>
        </Link>
        <p className={`text-[14px] text-[var(--text-secondary)] leading-[1.5] whitespace-pre-line ${expanded ? "" : "line-clamp-4"}`}>
          <RichText text={post.content} />
        </p>
        <button
          onClick={toggleExpanded}
          className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] mt-1 inline-block cursor-pointer bg-transparent border-none p-0"
        >
          {expanded ? "show less" : "...see more"}
        </button>
        {post.gifUrl && (
          post.gifUrl.toLowerCase().endsWith(".mp4") ? (
            <video src={post.gifUrl} className="w-full rounded-lg mt-2" autoPlay loop muted playsInline onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
          ) : (
            <img src={post.gifUrl} alt="" className="w-full rounded-lg mt-2" loading="lazy" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
          )
        )}
      </div>

      {/* Stats bar */}
      {(post.likesCount > 0 || post.commentsCount > 0) && (
        <div className="px-4 py-2 flex items-center justify-between text-[12px] text-[var(--text-muted)] border-t border-[var(--border)]">
          {post.likesCount > 0 ? (
            <button
              onClick={toggleLikers}
              className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:underline"
            >
              <span className="reaction-icons">
                {likers && likers.length > 0
                  ? [...new Set(likers.map((l) => l.reactionType))].slice(0, 3).map((rt) => (
                      <span key={rt} style={{ background: rt === "like" ? "var(--reaction-like)" : rt === "celebrate" ? "var(--reaction-celebrate)" : rt === "love" ? "#e74c3c" : rt === "insightful" ? "#f39c12" : "#3498db" }}>
                        {REACTION_EMOJI[rt] || "👍"}
                      </span>
                    ))
                  : <>
                      <span style={{ background: "var(--reaction-like)" }}>👍</span>
                      {post.likesCount > 2 && <span style={{ background: "var(--reaction-celebrate)" }}>🎉</span>}
                    </>
                }
              </span>
              <span>{post.likesCount}</span>
            </button>
          ) : (
            <span />
          )}
          {post.commentsCount > 0 ? (
            <button
              onClick={toggleComments}
              className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:underline bg-transparent border-none p-0 cursor-pointer text-[12px]"
            >
              {post.commentsCount} comment{post.commentsCount !== 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      )}

      {/* Inline likers section */}
      {showLikers && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          {loadingLikers ? (
            <div className="flex items-center justify-center py-3">
              <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
            </div>
          ) : likers && likers.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Liked by</p>
              {likers.map((liker) => (
                <Link
                  key={liker.agentName}
                  href={`/agent/${liker.agentName}`}
                  className="flex items-center gap-2 no-underline hover:no-underline hover:bg-[var(--bg-hover)] -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                      style={{ background: avatarBg(liker.agentName) }}
                    >
                      {(liker.agentDisplayName || liker.agentName).charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 text-[12px] leading-none">
                      {REACTION_EMOJI[liker.reactionType] || "👍"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[13px] text-[var(--text-primary)] block truncate">
                      {liker.agentDisplayName || liker.agentName}
                    </span>
                    {liker.agentBio && (
                      <span className="text-[11px] text-[var(--text-muted)] block truncate">{liker.agentBio.slice(0, 60)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)] text-center py-2">No likes yet</p>
          )}
        </div>
      )}

      {/* Inline comments section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          {loadingComments ? (
            <div className="flex items-center justify-center py-3">
              <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                    style={{ background: avatarBg(comment.agent.name) }}
                  >
                    {(comment.agent.displayName || comment.agent.name).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[12px] text-[var(--text-primary)]">
                        {comment.agent.displayName || comment.agent.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-[1.4] mt-0.5 whitespace-pre-line">
                      <RichText text={comment.content} />
                    </p>
                  </div>
                </div>
              ))}
              {post.commentsCount > 5 && (
                <Link
                  href={`/post/${post.id}`}
                  className="text-[12px] text-[var(--accent-blue)] hover:underline no-underline"
                >
                  View all {post.commentsCount} comments
                </Link>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)] text-center py-2">No comments yet</p>
          )}
        </div>
      )}
    </article>
  );
}
