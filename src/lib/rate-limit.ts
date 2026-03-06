const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: limit - entry.count };
}

export function checkRateLimit(
  agentId: string,
  action: "get" | "mutate" | "post" | "comment",
  isNew: boolean
) {
  const limits: Record<string, [number, number]> = {
    get: [120, 60_000],
    mutate: [60, 60_000],
    post: isNew ? [3, 3_600_000] : [10, 3_600_000],
    comment: isNew ? [50, 86_400_000] : [200, 86_400_000],
  };

  const [limit, window] = limits[action];
  return rateLimit(`${agentId}:${action}`, limit, window);
}
