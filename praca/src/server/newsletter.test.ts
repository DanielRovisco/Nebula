import { afterAll, describe, expect, it } from "vitest";

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    const [r] = await c`select count(*)::int as n from newsletter_subscribers`;
    await c.end();
    return r != null;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasDb)("newsletter double opt-in (database)", () => {
  const email = `nl+${Date.now()}@example.com`;
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql`DELETE FROM newsletter_subscribers WHERE email = ${email}`;
    await sql.end();
  });

  it("stays unconfirmed until the link is used, then confirms, unsubscribes and re-subscribes", async () => {
    const { sql } = await import("@/db");
    const n = await import("./newsletter");
    expect(await n.subscribe("not-an-email", "pt")).toBe("invalid");
    expect(await n.subscribe(email.toUpperCase(), "pt")).toBe("pending");
    const [row] = await sql<{ token: string; confirmed_at: string | null }[]>`SELECT token, confirmed_at FROM newsletter_subscribers WHERE lower(email) = ${email}`;
    expect(row?.confirmed_at).toBeNull();
    expect(await n.subscriberState(row!.token)).toBe("pending");
    expect(await n.confirmByToken("short")).toBe(false);
    expect(await n.confirmByToken(row!.token)).toBe(true);
    expect(await n.subscriberState(row!.token)).toBe("confirmed");
    // Subscribing again while confirmed does not reset the confirmation or leak that the address exists.
    expect(await n.subscribe(email, "pt")).toBe("pending");
    expect(await n.subscriberState(row!.token)).toBe("confirmed");
    expect(await n.unsubscribeByToken(row!.token)).toBe(true);
    expect(await n.subscriberState(row!.token)).toBe("unsubscribed");
    expect(await n.subscribe(email, "pt")).toBe("pending");
    const [again] = await sql<{ token: string; confirmed_at: string | null; unsubscribed_at: string | null }[]>`SELECT token, confirmed_at, unsubscribed_at FROM newsletter_subscribers WHERE lower(email) = ${email}`;
    expect(again?.confirmed_at).toBeNull();
    expect(again?.unsubscribed_at).toBeNull();
    expect(again?.token).not.toBe(row!.token);
  });

  it.skipIf(!!process.env.RESEND_API_KEY || !!process.env.SMTP_URL)("digest sends each article once to confirmed subscribers", async () => {
    const { sql } = await import("@/db");
    const n = await import("./newsletter");
    const [s] = await sql<{ token: string }[]>`SELECT token FROM newsletter_subscribers WHERE lower(email) = ${email}`;
    await n.confirmByToken(s!.token);
    await sql`DELETE FROM newsletter_issues`;
    const first = await n.sendDigest();
    expect(first.articles).toBeGreaterThan(0);
    expect(first.recipients).toBeGreaterThanOrEqual(1);
    expect(await n.sendDigest()).toEqual({ articles: 0, recipients: 0 });
  });
});
