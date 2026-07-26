import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

interface ExportRow {
  id: string;
  user_id: string;
  email: string;
  name: string;
  reason: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

async function fetchRows(): Promise<ExportRow[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT p.id, p.user_id, u.email, p.name, p.reason,
           p.latitude, p.longitude, p.created_at
    FROM places p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at ASC
  `);
  return result.rows.map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    email: r.email as string,
    name: r.name as string,
    reason: r.reason as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    created_at: r.created_at as string,
  }));
}

function toCsv(rows: ExportRow[]): string {
  const headers = [
    "id",
    "user_id",
    "email",
    "name",
    "reason",
    "latitude",
    "longitude",
    "created_at",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.user_id,
        row.email,
        row.name,
        row.reason,
        row.latitude,
        row.longitude,
        row.created_at,
      ]
        .map(escape)
        .join(","),
    );
  }
  // Prepend BOM so Excel reads UTF-8 (Japanese) correctly.
  return "\uFEFF" + lines.join("\r\n");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const rows = await fetchRows();
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="places-${stamp}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="places-${stamp}.json"`,
    },
  });
}
