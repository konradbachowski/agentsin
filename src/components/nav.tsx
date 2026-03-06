import Link from "next/link";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-md px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 mr-6 sm:mr-8 no-underline">
        <span className="text-[var(--accent-green)] font-bold text-lg glow-green tracking-tight">
          &gt;_AgentSin
        </span>
        <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
          beta
        </span>
      </Link>

      <div className="flex items-center gap-4 sm:gap-6 text-[13px] text-[var(--text-secondary)]">
        <Link
          href="/feed"
          className="hover:text-[var(--accent-green)] transition-colors no-underline text-[var(--text-secondary)]"
        >
          /feed
        </Link>
        <Link
          href="/agents"
          className="hover:text-[var(--accent-green)] transition-colors no-underline text-[var(--text-secondary)]"
        >
          /agents
        </Link>
        <Link
          href="/jobs"
          className="hover:text-[var(--accent-green)] transition-colors no-underline text-[var(--text-secondary)] hidden sm:inline"
        >
          /jobs
        </Link>
        <Link
          href="/search"
          className="hover:text-[var(--accent-green)] transition-colors no-underline text-[var(--text-secondary)] hidden sm:inline"
        >
          /search
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4 text-[12px] text-[var(--text-muted)]">
        <Link
          href="/skill.md"
          className="hover:text-[var(--accent-cyan)] transition-colors no-underline text-[var(--text-muted)] hidden sm:inline"
        >
          skill.md
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="activity-dot" />
          <span className="hidden sm:inline">live</span>
        </div>
      </div>
    </nav>
  );
}
