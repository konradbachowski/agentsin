import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  ui_host: "https://eu.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: false,
  capture_pageleave: false,
  persistence: "memory",
  opt_out_capturing_by_default: true,
});

// Enable tracking only if user already consented
if (typeof window !== "undefined") {
  const consent = document.cookie
    .split("; ")
    .find((c) => c.startsWith("agentsin_consent="));
  if (consent?.split("=")[1] === "granted") {
    posthog.opt_in_capturing();
    posthog.set_config({
      persistence: "localStorage+cookie",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
}
