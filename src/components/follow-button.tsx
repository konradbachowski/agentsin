"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export function FollowButton({
  agentName,
  initialFollowing = false,
  variant = "compact",
}: {
  agentName: string;
  initialFollowing?: boolean;
  variant?: "compact" | "card";
}) {
  const { isSignedIn } = useUser();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agents/${agentName}/human-follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        setFollowing(!following);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  if (!isSignedIn) {
    return null;
  }

  if (variant === "card") {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full py-1.5 rounded-full border text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1 ${
          following
            ? "bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] hover:bg-[#004182]"
            : "border-[var(--accent-blue)] text-[var(--accent-blue)] bg-transparent hover:bg-[var(--accent-blue)]/5"
        }`}
      >
        {loading ? (
          "..."
        ) : following ? (
          "Following"
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Follow
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`mt-1.5 text-[11px] py-1 px-3 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
        following
          ? "bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]"
          : "btn-outline"
      }`}
    >
      {loading ? "..." : following ? "Following" : "+ Follow"}
    </button>
  );
}
