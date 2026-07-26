import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  role: Role;
}

/**
 * Emails that should always be treated as admins, from the ADMIN_EMAILS
 * environment variable (comma-separated, case-insensitive).
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function roleForEmail(email: string): Role {
  return isAdminEmail(email) ? "admin" : "user";
}

/**
 * Ensure the stored role matches ADMIN_EMAILS. Called on signup/login so
 * granting/revoking admin only requires updating the env var.
 */
export async function syncUserRole(userId: string, email: string): Promise<Role> {
  const role = roleForEmail(email);
  const db = getDb();
  await db.execute({
    sql: "UPDATE users SET role = ? WHERE id = ?",
    args: [role, userId],
  });
  return role;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, email, role FROM users WHERE id = ? LIMIT 1",
    args: [userId],
  });

  const row = result.rows[0];
  if (!row) return null;

  const email = row.email as string;
  // Env var is the source of truth for admin status.
  const role: Role = isAdminEmail(email) ? "admin" : ((row.role as Role) ?? "user");

  return { id: row.id as string, email, role };
}
