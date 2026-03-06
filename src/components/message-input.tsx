"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MessageInput({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showKarma, setShowKarma] = useState(false);
  const [karmaAmount, setKarmaAmount] = useState("");
  const [karmaMsg, setKarmaMsg] = useState("");
  const router = useRouter();

  async function handleSend() {
    const text = content.trim();
    if (!text) return;

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, content: text }),
    });

    if (res.ok) {
      setContent("");
      startTransition(() => {
        router.refresh();
      });
    }
  }

  async function handleKarmaSend() {
    const amt = parseInt(karmaAmount);
    if (!amt || amt < 1) return;

    const res = await fetch("/api/karma/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_name: partnerName, amount: amt }),
    });

    const data = await res.json();
    if (res.ok) {
      // Also send a message so it shows in the thread
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, content: `💰 Sent ${amt} karma` }),
      });
      setKarmaMsg(`Sent ${amt} karma!`);
      setKarmaAmount("");
      setTimeout(() => { setKarmaMsg(""); setShowKarma(false); }, 2000);
      startTransition(() => router.refresh());
    } else {
      setKarmaMsg(data.error || "Failed");
      setTimeout(() => setKarmaMsg(""), 3000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-2">
      {showKarma && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)]">
          <span className="text-[12px] text-[var(--text-muted)] shrink-0">Send karma:</span>
          <input
            type="number"
            min="1"
            value={karmaAmount}
            onChange={(e) => setKarmaAmount(e.target.value)}
            placeholder="Amount"
            className="w-20 px-2 py-1 text-[12px] border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
          />
          <button
            onClick={handleKarmaSend}
            disabled={!karmaAmount || parseInt(karmaAmount) < 1}
            className="px-3 py-1 text-[12px] font-semibold rounded-full transition-colors disabled:opacity-40"
            style={{ background: "var(--accent-orange)", color: "white" }}
          >
            Send
          </button>
          {karmaMsg && (
            <span className="text-[11px] font-semibold text-[var(--accent-green)]">{karmaMsg}</span>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowKarma(!showKarma)}
          className="h-9 px-3 rounded-full flex items-center gap-1.5 shrink-0 transition-colors border-none cursor-pointer text-[12px] font-semibold"
          style={{
            background: showKarma ? "rgba(231, 163, 62, 0.15)" : "var(--bg-hover)",
            color: showKarma ? "var(--accent-orange)" : "var(--text-muted)",
          }}
          title="Send karma"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          Karma
        </button>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          className="flex-1 resize-none rounded-full px-4 py-2 text-[13px] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
          style={{ maxHeight: "120px" }}
          disabled={isPending}
        />
        <button
          onClick={handleSend}
          disabled={isPending || !content.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
          style={{
            background: content.trim() ? "var(--accent-blue)" : "var(--bg-hover)",
            color: content.trim() ? "white" : "var(--text-muted)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
