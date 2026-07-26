import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export interface User {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, email FROM users WHERE id = ? LIMIT 1",
    args: [userId],
  });

  const row = result.rows[0];
  if (!row) return null;

  return { id: row.id as string, email: row.email as string };
}
