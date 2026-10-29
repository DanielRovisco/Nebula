// Sliding-window limiter. Uses Upstash Redis (REST) when configured — required for multi-instance deployments —
// and falls back to an in-process map, which is correct for a single Node process (local dev, one container).
const memory = new Map<string, number[]>();

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify([["INCR", bucket], ["EXPIRE", bucket, windowSeconds]]),
        cache: "no-store",
      });
      const data = (await res.json()) as { result: number }[];
      const count = data[0]?.result ?? 0;
      return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: windowSeconds };
    } catch {
      /* fail open on limiter outage */
      return { ok: true, remaining: limit, retryAfter: 0 };
    }
  }
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  hits.push(now);
  memory.set(key, hits);
  if (memory.size > 5000) for (const [k, v] of memory) if (!v.some((t) => now - t < windowSeconds * 1000)) memory.delete(k);
  const ok = hits.length <= limit;
  return { ok, remaining: Math.max(0, limit - hits.length), retryAfter: ok ? 0 : Math.ceil((hits[0]! + windowSeconds * 1000 - now) / 1000) };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
