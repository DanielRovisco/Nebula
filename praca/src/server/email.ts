import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { ReactElement } from "react";

const from = process.env.EMAIL_FROM ?? "Praça <ola@praca.example>";
// Only a real production deployment must fail loudly when no transport works; local/staging runs fall back to the log.
const strict = () => process.env.NEXT_PUBLIC_APP_ENV === "production";

export interface MailInput {
  to: string;
  subject: string;
  react: ReactElement;
  /** Printed to the log in development when no transport is available. */
  devHint?: string;
}

/**
 * Sends through Resend when RESEND_API_KEY is set, else through SMTP (Mailpit in local dev),
 * else logs the message. Never throws on transport absence in development.
 */
export async function sendMail({ to, subject, react, devHint }: MailInput): Promise<"resend" | "smtp" | "log"> {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) throw new Error(`Resend: ${error.message}`);
    return "resend";
  }

  const smtp = process.env.SMTP_URL;
  if (smtp) {
    try {
      const t = nodemailer.createTransport(smtp, { connectionTimeout: 2000, greetingTimeout: 2000, socketTimeout: 4000 });
      await t.sendMail({ from, to, subject, html, text });
      if (devHint) console.info(`[email] ${devHint}`);
      return "smtp";
    } catch (e) {
      if (strict()) throw e;
    }
  }

  if (strict()) throw new Error("No email transport configured (set RESEND_API_KEY)");
  console.info(`[email:dev] to=${to} subject="${subject}"${devHint ? `\n  ${devHint}` : ""}`);
  return "log";
}
