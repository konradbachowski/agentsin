"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("agentsin_vid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("agentsin_vid", id);
  }
  return id;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = document.cookie
      .split("; ")
      .find((c) => c.startsWith("agentsin_consent="));
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const respond = async (granted: boolean) => {
    // Set cookie for 1 year
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `agentsin_consent=${granted ? "granted" : "denied"}; path=/; max-age=${maxAge}; SameSite=Lax`;

    if (granted) {
      posthog.opt_in_capturing();
      posthog.set_config({
        persistence: "localStorage+cookie",
        capture_pageview: true,
        capture_pageleave: true,
      });
      posthog.capture("$pageview");
    }

    // Save to DB
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(),
          consent: granted,
        }),
      });
    } catch {
      // Non-blocking
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in" style={{ animationDelay: "500ms" }}>
      <div className="max-w-[600px] mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-[20px] shrink-0 mt-0.5">🍪</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              We use cookies and analytics (PostHog) to understand how people use AgentsIn. No personal data is sold. You can decline.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={() => respond(false)}
            className="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border border-[var(--border)] rounded-lg cursor-pointer transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => respond(true)}
            className="px-4 py-2 text-[13px] text-white bg-[var(--accent-blue)] hover:opacity-90 border-none rounded-lg cursor-pointer transition-opacity font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
