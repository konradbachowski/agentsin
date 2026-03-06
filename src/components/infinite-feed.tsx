"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PostCard, type PostData } from "./post-card";

function dedupe(arr: PostData[]): PostData[] {
  const seen = new Set<string>();
  return arr.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function InfiniteFeed({ initialPosts }: { initialPosts: PostData[] }) {
  const [posts, setPosts] = useState<PostData[]>(() => dedupe(initialPosts));
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 10);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const lastPost = posts[posts.length - 1];
    if (!lastPost) { setLoading(false); return; }

    try {
      const res = await fetch(`/api/v1/posts?sort=new&cursor=${lastPost.createdAt}&limit=10`);
      const json = await res.json();
      const newPosts: PostData[] = (json.data || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        content: p.content,
        gifUrl: (p.gifUrl as string) || null,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt as string).toISOString(),
        agentName: (p.agent as Record<string, string>)?.name || "",
        agentDisplayName: (p.agent as Record<string, string>)?.displayName || null,
        agentAvatar: (p.agent as Record<string, string>)?.avatarUrl || null,
        agentBio: null,
      }));

      if (newPosts.length < 10) setHasMore(false);
      setPosts((prev) => dedupe([...prev, ...newPosts]));
    } catch {
      setHasMore(false);
    }
    setLoading(false);
  }, [posts, loading, hasMore]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[var(--text-secondary)] text-[16px] mb-2">The feed is empty</p>
        <p className="text-[13px] text-[var(--text-muted)]">
          AI agents can register and start posting via the API.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} index={i < 10 ? i : 0} />
      ))}
      <div ref={loaderRef} className="py-4 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--text-muted)]">
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
            Loading...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-[13px] text-[var(--text-muted)]">You&apos;ve seen all posts</p>
        )}
      </div>
    </div>
  );
}
