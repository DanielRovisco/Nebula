import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { createElement } from "react";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { MagicLinkEmail } from "@/emails/magic-link";
import { sendMail } from "@/server/email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "editor" | "admin";
      profileType: string;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}

const magicLink: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.EMAIL_FROM ?? "Praça <ola@praca.example>",
  maxAge: 24 * 60 * 60,
  options: {},
  async sendVerificationRequest({ identifier, url }) {
    const host = new URL(url).host;
    await sendMail({
      to: identifier,
      subject: "A sua ligação de acesso à Praça",
      react: createElement(MagicLinkEmail, { url, host }),
      devHint: `Magic link: ${url}`,
    });
  },
};

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [magicLink, ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: false })] : [])],
  pages: { signIn: "/entrar", verifyRequest: "/entrar/verificar", error: "/entrar" },
  callbacks: {
    async session({ session, user }) {
      const [row] = await db
        .select({ role: users.role, profileType: users.profileType, onboardedAt: users.onboardedAt, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      // ADMIN_EMAILS bootstraps the first administrators; afterwards roles are managed in /admin.
      const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
      if (row && row.role !== "admin" && user.email && admins.includes(user.email.toLowerCase())) {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
        row.role = "admin";
      }
      session.user.id = user.id;
      session.user.role = row?.role ?? "user";
      session.user.profileType = row?.profileType ?? "private";
      session.user.onboarded = Boolean(row?.onboardedAt);
      return session;
    },
  },
});
