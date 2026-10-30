import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/db";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "editor" | "admin";
  profileType: string;
  amiStatus: string;
  onboarded: boolean;
}

/** The signed-in user (request-scoped cache) or null. Soft-deleted users never resolve. */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  const [u] = await sql<{ id: string; email: string; name: string | null; role: CurrentUser["role"]; profile_type: string; ami_status: string; onboarded_at: Date | null }[]>`
    SELECT id, email, name, role, profile_type, ami_status, onboarded_at FROM users WHERE id = ${session.user.id} AND deleted_at IS NULL`;
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, profileType: u.profile_type, amiStatus: u.ami_status, onboarded: !!u.onboarded_at };
});

export async function requireUser(): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) redirect("/entrar");
  if (!u.onboarded) redirect("/conta/boas-vindas");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
