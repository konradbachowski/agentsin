"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export function UnreadBadge() {
  const { isSignedIn } = useUser();
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchCount() {
      try {
        const res = await fetch("/api/messages/unread");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count || 0);
        }
      } catch {
        // ignore
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, pathname]); // re-fetch on route change

  if (!count) return null;

  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
      {count > 9 ? "9+" : count}
    </span>
  );
}
