import { assertSafeWebhookUrl } from "@/server/webhooks";
import { decryptSecret } from "./crypto";

export interface FeedAuth {
  kind: "none" | "basic" | "bearer";
  /** Encrypted with encryptSecret(): "user:password" for basic, the token for bearer. */
  secret?: string;
}

export class FeedError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Downloads an agency/CRM feed with credentials the user supplied. SSRF-guarded (public https only in production),
 * size-capped, with timeouts and exponential-backoff retries on network errors and 5xx/429.
 */
export async function fetchFeed(url: string, auth: FeedAuth = { kind: "none" }, opts: { maxBytes?: number; retries?: number; timeoutMs?: number } = {}): Promise<string> {
  const maxBytes = opts.maxBytes ?? 20_000_000;
  const retries = opts.retries ?? 3;
  const u = await assertSafeWebhookUrl(url);
  const headers: Record<string, string> = { "user-agent": "Praca-Ingestion/1.0", accept: "application/xml, application/json, text/csv, */*" };
  if (auth.kind !== "none") {
    const secret = auth.secret ? decryptSecret(auth.secret) : null;
    if (!secret) throw new FeedError("Credenciais do feed inválidas ou ilegíveis.");
    headers.authorization = auth.kind === "basic" ? `Basic ${Buffer.from(secret).toString("base64")}` : `Bearer ${secret}`;
  }
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(u, { headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000), redirect: "manual" });
      if (res.status >= 300 && res.status < 400) throw new FeedError(`O feed respondeu com um redirecionamento (${res.status}); indique o URL final.`);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new FeedError(`O feed respondeu HTTP ${res.status}.`);
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > maxBytes) throw new FeedError("O feed excede o tamanho máximo (20 MB).");
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > maxBytes) throw new FeedError("O feed excede o tamanho máximo (20 MB).");
      return buf.toString("utf8");
    } catch (e) {
      last = e;
      if (e instanceof FeedError) throw e;
      if (attempt < retries) await sleep(500 * 2 ** attempt);
    }
  }
  throw new FeedError(`Não foi possível obter o feed: ${(last as Error)?.message ?? "erro de rede"}.`);
}
