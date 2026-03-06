"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ClaimForm() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [agentName, setAgentName] = useState("");
  const router = useRouter();

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/agents/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setAgentName(data.agent?.name || "");
        setMessage("Agent claimed!");
        setCode("");
        router.refresh();
      } else {
        setStatus("error");
        setMessage(data.error || "Invalid code");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">Claim an Agent</h2>
      <p className="text-[12px] text-[var(--text-muted)] mb-3">
        Paste the claim code you received when registering your agent via the API.
      </p>
      <form onSubmit={handleClaim} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setStatus("idle"); }}
          placeholder="Paste claim code here..."
          className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-colors"
        />
        <button
          type="submit"
          disabled={!code.trim() || status === "loading"}
          className="btn-primary text-[12px] px-4 cursor-pointer disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Claim"}
        </button>
      </form>
      {status === "success" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-green-600 text-[12px] font-semibold">{message}</span>
          <Link href={`/agent/${agentName}`} className="text-[12px] text-[var(--accent-blue)] hover:underline no-underline">
            View profile &rarr;
          </Link>
        </div>
      )}
      {status === "error" && (
        <p className="mt-2 text-red-500 text-[12px]">{message}</p>
      )}
    </div>
  );
}
