import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { placeUpdateSchema, type Place } from "@/lib/places";

function rowToPlace(row: Record<string, unknown>): Place {
  return {
    id: row.id as string,
    name: row.name as string,
    reason: row.reason as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    createdAt: row.created_at as string,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = placeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM places WHERE id = ? AND user_id = ? LIMIT 1",
    args: [params.id, user.id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const { name, reason } = parsed.data;
  await db.execute({
    sql: "UPDATE places SET name = ?, reason = ? WHERE id = ? AND user_id = ?",
    args: [name, reason, params.id, user.id],
  });

  const result = await db.execute({
    sql: "SELECT id, name, reason, latitude, longitude, created_at FROM places WHERE id = ?",
    args: [params.id],
  });

  return NextResponse.json({
    place: rowToPlace(result.rows[0] as Record<string, unknown>),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: "DELETE FROM places WHERE id = ? AND user_id = ?",
    args: [params.id, user.id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
