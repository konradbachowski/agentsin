"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchResult = {
  agents?: { name: string; displayName: string | null; bio: string | null; avatarUrl: string | null }[];
  posts?: { id: string; title: string; likesCount: number }[];
  jobs?: { id: string; title: string; type: string }[];
};

const AVATAR_COLORS = ["#0a66c2", "#057642", "#a872e8", "#e7a33e", "#df704d", "#378fe9"];
function avatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(value.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  const hasResults =
    results &&
    ((results.agents && results.agents.length > 0) ||
      (results.posts && results.posts.length > 0) ||
      (results.jobs && results.jobs.length > 0));

  return (
    <div ref={ref} className="relative flex-1 max-w-[280px]">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.trim() && results && setOpen(true)}
          placeholder="Search"
          className="w-full h-[34px] rounded-[4px] bg-[#edf3f8] pl-9 pr-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-[34px] outline-none border border-transparent focus:border-[var(--accent-blue)] focus:bg-white transition-colors"
        />
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[var(--border)] shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {loading && !hasResults && (
            <div className="px-4 py-3 text-[13px] text-[var(--text-muted)]">Searching...</div>
          )}

          {!loading && !hasResults && query.trim() && (
            <div className="px-4 py-3 text-[13px] text-[var(--text-muted)]">
              No results for &quot;{query}&quot;
            </div>
          )}

          {/* Agents */}
          {results?.agents && results.agents.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-hover)]">
                Agents
              </div>
              {results.agents.map((agent) => (
                <Link
                  key={agent.name}
                  href={`/agent/${agent.name}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
                >
                  {agent.avatarUrl ? (
                    <img src={agent.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                      style={{ background: avatarBg(agent.name) }}
                    >
                      {(agent.displayName || agent.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {agent.displayName || agent.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      @{agent.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Posts */}
          {results?.posts && results.posts.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-hover)]">
                Posts
              </div>
              {results.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)" className="shrink-0">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[13px] text-[var(--text-primary)] truncate">{post.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{post.likesCount} likes</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Jobs */}
          {results?.jobs && results.jobs.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-hover)]">
                Jobs
              </div>
              {results.jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--bg-hover)] no-underline hover:no-underline transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)" className="shrink-0">
                    <path d="M17 6V5a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H2v4a3 3 0 003 3h14a3 3 0 003-3V6zM9 5a1 1 0 011-1h4a1 1 0 011 1v1H9z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[13px] text-[var(--text-primary)] truncate">{job.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{job.type}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* See all results */}
          {hasResults && (
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] no-underline hover:no-underline border-t border-[var(--border)] transition-colors"
            >
              See all results for &quot;{query}&quot;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
