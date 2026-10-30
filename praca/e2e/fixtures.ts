import { test as base, expect } from "@playwright/test";
import postgres from "postgres";
import { randomBytes } from "node:crypto";

type Plan = "free" | "pro" | "agency";
interface Options {
  plan: Plan;
  role: "user" | "admin";
}
interface Fixtures {
  signedIn: { email: string; userId: string; orgId: string | null };
}

/** Consent pre-accepted so the cookie banner never covers controls; users and sessions are created directly in the database. */
export const test = base.extend<Fixtures & Options>({
  plan: ["free", { option: true }],
  role: ["user", { option: true }],
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem("praca.consent.v1", JSON.stringify({ analytics: false, version: "2025-01", at: new Date().toISOString() })));
    // Forms are server actions: clicking before React hydrates would submit natively and do nothing, so every navigation waits for the network to settle.
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const res = await goto(url, options);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      return res;
    };
    await use(page);
  },
  // The magic-link email is not readable from tests, so we insert a user + database session and set the Auth.js cookie.
  signedIn: async ({ context, plan, role }, use) => {
    const sql = postgres(process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca", { max: 1, onnotice: () => {} });
    const email = `e2e+${randomBytes(4).toString("hex")}@example.com`;
    const token = randomBytes(24).toString("hex");
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, role, onboarded_at, profile_type) VALUES (${email}, 'E2E', ${role}::user_role, now(), ${plan === "free" ? "private" : "agent"}::profile_type) RETURNING id`;
    let orgId: string | null = null;
    if (plan === "agency") {
      const [o] = await sql<{ id: string }[]>`INSERT INTO organizations (name, slug, plan, email) VALUES ('Agência E2E', ${`e2e-${randomBytes(4).toString("hex")}`}, 'agency', ${email}) RETURNING id`;
      orgId = o!.id;
      await sql`INSERT INTO memberships (organization_id, user_id, role) VALUES (${orgId}, ${u!.id}, 'owner')`;
      await sql`INSERT INTO subscriptions (organization_id, plan, status, seats, stripe_subscription_id) VALUES (${orgId}, 'agency', 'active', 5, ${`e2e_${randomBytes(6).toString("hex")}`})`;
    } else if (plan === "pro") {
      await sql`INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id) VALUES (${u!.id}, 'pro', 'active', ${`e2e_${randomBytes(6).toString("hex")}`})`;
    }
    await sql`INSERT INTO sessions (session_token, user_id, expires) VALUES (${token}, ${u!.id}, now() + interval '1 day')`;
    await context.addCookies([{ name: "authjs.session-token", value: token, url: `http://localhost:${process.env.E2E_PORT ?? 3100}` }]);
    await use({ email, userId: u!.id, orgId });
    if (orgId) await sql`DELETE FROM organizations WHERE id = ${orgId}`;
    await sql`DELETE FROM users WHERE id = ${u!.id}`;
    await sql.end();
  },
});
export { expect };
