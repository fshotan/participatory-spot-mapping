import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { MAX_PLACES_PER_USER, placeInputSchema, type Place } from "@/lib/places";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, name, reason, latitude, longitude, created_at FROM places WHERE user_id = ? ORDER BY created_at ASC",
    args: [user.id],
  });

  const places = result.rows.map((r) => rowToPlace(r as Record<string, unknown>));
  return NextResponse.json({ places, maxPlaces: MAX_PLACES_PER_USER });
}

export async function POST(request: Request) {
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

  const parsed = placeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  const db = getDb();
  const countResult = await db.execute({
    sql: "SELECT COUNT(*) AS count FROM places WHERE user_id = ?",
    args: [user.id],
  });
  const count = Number(countResult.rows[0]?.count ?? 0);
  if (count >= MAX_PLACES_PER_USER) {
    return NextResponse.json(
      { error: `投稿できるのは最大${MAX_PLACES_PER_USER}地点までです` },
      { status: 409 },
    );
  }

  const { name, reason, latitude, longitude } = parsed.data;
  const id = randomUUID();

  await db.execute({
    sql: "INSERT INTO places (id, user_id, name, reason, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, user.id, name, reason, latitude, longitude],
  });

  const result = await db.execute({
    sql: "SELECT id, name, reason, latitude, longitude, created_at FROM places WHERE id = ?",
    args: [id],
  });

  return NextResponse.json(
    { place: rowToPlace(result.rows[0] as Record<string, unknown>) },
    { status: 201 },
  );
}
