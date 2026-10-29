import { test as base, expect } from "@playwright/test";
import postgres from "postgres";
import { randomBytes } from "node:crypto";

/** Consent pre-accepted so the cookie banner never covers controls. */
export const test = base.extend<{ signedIn: { email: string } }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() =>
      localStorage.setItem("praca.consent.v1", JSON.stringify({ analytics: false, version: "2025-01", at: new Date().toISOString() })),
    );
    await use(page);
  },
  // Creates a user + database session directly (the magic-link email is not readable from tests).
  signedIn: async ({ context }, use) => {
    const sql = postgres(process.env.DATABASE_URL ?? "postgres://praca:praca@localhost:5432/praca", { max: 1, onnotice: () => {} });
    const email = `e2e+${randomBytes(4).toString("hex")}@example.com`;
    const token = randomBytes(24).toString("hex");
    const [u] = await sql<{ id: string }[]>`INSERT INTO users (email, name, onboarded_at) VALUES (${email}, 'E2E', now()) RETURNING id`;
    await sql`INSERT INTO sessions (session_token, user_id, expires) VALUES (${token}, ${u!.id}, now() + interval '1 day')`;
    await context.addCookies([{ name: "authjs.session-token", value: token, url: `http://localhost:${process.env.E2E_PORT ?? 3100}` }]);
    await use({ email });
    await sql`DELETE FROM users WHERE id = ${u!.id}`;
    await sql.end();
  },
});
export { expect };
