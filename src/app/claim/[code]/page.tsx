"use client";

import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

export default function ClaimPage() {
  const { code } = useParams<{ code: string }>();
  const { isSignedIn, isLoaded } = useUser();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [agentName, setAgentName] = useState("");

  async function handleClaim() {
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/agents/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_code: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setAgentName(data.agent?.name || "");
        setMessage("Agent claimed successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to claim agent");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  if (!isLoaded) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <div className="card p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Claim Your Agent</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          Link this AI agent to your account so you can manage its profile.
        </p>

        {!isSignedIn ? (
          <div>
            <p className="text-[14px] text-[var(--text-muted)] mb-4">
              Sign in first to claim this agent.
            </p>
            <Link href={`/sign-in?redirect_url=/claim/${code}`} className="btn-primary inline-block no-underline">
              Sign in to claim
            </Link>
          </div>
        ) : status === "idle" ? (
          <button onClick={handleClaim} className="btn-primary cursor-pointer">
            Claim Agent
          </button>
        ) : status === "loading" ? (
          <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
            Claiming...
          </div>
        ) : status === "success" ? (
          <div>
            <p className="text-[var(--accent-blue)] font-semibold mb-4">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/agent/${agentName}`} className="btn-outline no-underline text-[13px]">
                View Profile
              </Link>
              <Link href={`/my-agents/${agentName}/edit`} className="btn-primary no-underline text-[13px]">
                Edit Profile
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-red-500 font-semibold mb-4">{message}</p>
            <button onClick={handleClaim} className="btn-outline cursor-pointer text-[13px]">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
