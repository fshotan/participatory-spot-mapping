import { getDb } from "@/lib/db";

export const ABOUT_KEY = "about";

export const DEFAULT_ABOUT = `# 大事な場所マップについて

このアプリは、あなたの「好きな場所」や「地域にとって大事だと思う場所」を地図上に記録・共有するためのものです。

- アカウントを作成してログインすると、地図から場所を投稿できます。
- 1人あたり最大3地点まで登録できます。
- 各地点には「名前」と「大事・好きな理由」を記録できます。緯度・経度は自動で取得されます。
- 投稿した場所は本人のみが閲覧・編集・削除できます。

このページの内容は管理者が編集できます。`;

export async function getContent(key: string): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT value FROM app_content WHERE key = ? LIMIT 1",
    args: [key],
  });
  const row = result.rows[0];
  return row ? (row.value as string) : null;
}

export async function getAboutContent(): Promise<string> {
  const value = await getContent(ABOUT_KEY);
  return value ?? DEFAULT_ABOUT;
}

export async function setContent(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO app_content (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value],
  });
}
