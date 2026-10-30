import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/db";
import { NewsletterConfirmEmail, NewsletterDigestEmail } from "@/emails/newsletter";
import { siteUrl } from "@/lib/env";
import { uuidv7 } from "@/lib/ids";
import { sendMail } from "./email";

export const CONSENT_VERSION = "2026-10";
export const emailSchema = z.string().trim().toLowerCase().email().max(200);

const base = (locale: string) => `${siteUrl}${locale === "en" ? "/en" : ""}`;

/**
 * Double opt-in: stores the address unconfirmed and emails a confirmation link. Re-subscribing after an unsubscribe
 * starts a fresh confirmation. The answer never reveals whether the address was already subscribed.
 */
export async function subscribe(emailRaw: string, locale: "pt" | "en"): Promise<"pending" | "invalid"> {
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) return "invalid";
  const email = parsed.data;
  const token = randomBytes(24).toString("base64url");
  const [row] = await sql<{ token: string; confirmed_at: string | null; unsubscribed_at: string | null }[]>`
    INSERT INTO newsletter_subscribers (id, email, token, consent_version) VALUES (${uuidv7()}, ${email}, ${token}, ${CONSENT_VERSION})
    ON CONFLICT (lower(email)) DO UPDATE SET
      token = CASE WHEN newsletter_subscribers.unsubscribed_at IS NOT NULL THEN EXCLUDED.token ELSE newsletter_subscribers.token END,
      unsubscribed_at = NULL,
      confirmed_at = CASE WHEN newsletter_subscribers.unsubscribed_at IS NOT NULL THEN NULL ELSE newsletter_subscribers.confirmed_at END,
      consent_version = EXCLUDED.consent_version
    RETURNING token, confirmed_at, unsubscribed_at`;
  if (row && !row.confirmed_at) {
    const url = `${base(locale)}/newsletter/confirmar/${row.token}`;
    await sendMail({
      to: email,
      subject: locale === "en" ? "Confirm your Praça newsletter subscription" : "Confirme a subscrição da newsletter da Praça",
      react: NewsletterConfirmEmail({ url, locale }),
      devHint: `newsletter confirm: ${url}`,
    });
  }
  return "pending";
}

const tokenOk = (t: string) => /^[A-Za-z0-9_-]{16,64}$/.test(t);

export async function confirmByToken(token: string): Promise<boolean> {
  if (!tokenOk(token)) return false;
  const r = await sql`UPDATE newsletter_subscribers SET confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = NULL WHERE token = ${token} RETURNING id`;
  return r.length > 0;
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!tokenOk(token)) return false;
  const r = await sql`UPDATE newsletter_subscribers SET unsubscribed_at = coalesce(unsubscribed_at, now()) WHERE token = ${token} RETURNING id`;
  return r.length > 0;
}

export async function subscriberState(token: string): Promise<"confirmed" | "pending" | "unsubscribed" | null> {
  if (!tokenOk(token)) return null;
  const [r] = await sql<{ confirmed_at: string | null; unsubscribed_at: string | null }[]>`SELECT confirmed_at, unsubscribed_at FROM newsletter_subscribers WHERE token = ${token}`;
  if (!r) return null;
  return r.unsubscribed_at ? "unsubscribed" : r.confirmed_at ? "confirmed" : "pending";
}

/** Sends the not-yet-sent published articles to every confirmed subscriber (Portuguese issues only, matching the article locale). */
export async function sendDigest(): Promise<{ articles: number; recipients: number }> {
  const arts = await sql<{ id: string; slug: string; title: string; excerpt: string | null }[]>`
    SELECT a.id, a.slug, a.title, a.excerpt FROM articles a
    WHERE a.locale = 'pt' AND a.deleted_at IS NULL AND a.published_at IS NOT NULL AND a.published_at <= now()
      AND NOT EXISTS (SELECT 1 FROM newsletter_issues i WHERE i.article_id = a.id)
    ORDER BY a.published_at DESC LIMIT 5`;
  if (!arts.length) return { articles: 0, recipients: 0 };
  const subs = await sql<{ email: string; token: string }[]>`SELECT email, token FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`;
  let sent = 0;
  for (const s of subs) {
    const unsubscribeUrl = `${siteUrl}/newsletter/cancelar/${s.token}`;
    try {
      await sendMail({
        to: s.email,
        subject: arts[0]!.title,
        react: NewsletterDigestEmail({ articles: arts.map((a) => ({ title: a.title, excerpt: a.excerpt, url: `${siteUrl}/blog/${a.slug}` })), unsubscribeUrl, locale: "pt" }),
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      sent++;
    } catch {
      /* one bad address must not stop the issue */
    }
  }
  for (const a of arts) await sql`INSERT INTO newsletter_issues (article_id, recipients) VALUES (${a.id}, ${sent}) ON CONFLICT DO NOTHING`;
  return { articles: arts.length, recipients: sent };
}
