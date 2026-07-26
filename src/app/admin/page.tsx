import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  reason: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

async function fetchRows(): Promise<AdminRow[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT p.id, u.email, p.name, p.reason, p.latitude, p.longitude, p.created_at
    FROM places p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
  `);
  return result.rows.map((r) => ({
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    reason: r.reason as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    created_at: r.created_at as string,
  }));
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/map");

  const rows = await fetchRows();

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Link href="/map" className="back-link">
          ← 戻る
        </Link>
        <span className="page-title">管理</span>
      </div>

      <div className="admin-body">
        <div className="admin-toolbar">
          <span className="admin-count">全 {rows.length} 件</span>
          <div className="admin-downloads">
            <a className="btn btn-secondary" href="/api/admin/export?format=csv">
              CSVダウンロード
            </a>
            <a className="btn btn-secondary" href="/api/admin/export?format=json">
              JSONダウンロード
            </a>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="empty">投稿はまだありません。</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ユーザー</th>
                  <th>名前</th>
                  <th>理由</th>
                  <th>緯度</th>
                  <th>経度</th>
                  <th>作成日時</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>{r.name}</td>
                    <td>{r.reason}</td>
                    <td>{r.latitude.toFixed(5)}</td>
                    <td>{r.longitude.toFixed(5)}</td>
                    <td>{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
