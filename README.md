# 大事な場所マップ (Important Places Map)

ユーザーが自分のアカウントを作成・ログインし、「好きな場所」や「地域にとって大事な場所」を地図上に投稿できるモバイルファーストの Web アプリです。

## 主な機能

- メール + パスワードによるアカウント登録・ログイン
- オープンソースの地図（[MapLibre GL JS](https://maplibre.org/) + [OpenStreetMap](https://www.openstreetmap.org/) タイル）
- 地図の**長押し**、または「＋場所を追加」→タップで投稿地点を選択
- 場所の属性：**名前** と **大事・好きな理由**
- 登録すると**緯度・経度が自動で取得・記録**されます
- 1 ユーザーあたり**最大 3 地点**まで投稿可能
- 投稿は**本人のみ**が閲覧・編集・削除できます
- 現在地の自動取得・移動に対応したモバイル最適化 UI

## 技術スタック

- [Next.js 14](https://nextjs.org/)（App Router）+ TypeScript
- [Turso](https://turso.tech/) / [libSQL](https://github.com/tursodatabase/libsql)（`@libsql/client`）
- 認証: パスワードハッシュ（`bcryptjs`）+ 署名付きセッション Cookie（`jose`）
- 地図: `maplibre-gl` + OpenStreetMap ラスタータイル

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数

`.env.example` を `.env.local` にコピーして設定します。

```bash
cp .env.example .env.local
```

- ローカル開発では `TURSO_DATABASE_URL=file:local.db` のようにローカルファイルを使えます。
- Turso クラウドを使う場合は、[Turso CLI](https://docs.turso.tech/cli/introduction) で作成した接続情報を設定します。

```bash
turso db create important-places
turso db show important-places        # libsql:// の URL を TURSO_DATABASE_URL に設定
turso db tokens create important-places  # トークンを TURSO_AUTH_TOKEN に設定
```

- `AUTH_SECRET` にはセッション署名用のランダムな長い文字列を設定します（例: `openssl rand -hex 32`）。

### 3. データベースのマイグレーション

```bash
npm run db:migrate
```

`users` と `places` テーブルを作成します。

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 を開きます。

## スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック（`tsc --noEmit`） |
| `npm run db:migrate` | DB マイグレーション |

## データモデル

`places` テーブル:

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT (UUID) | 主キー |
| `user_id` | TEXT | 投稿者（`users.id`） |
| `name` | TEXT | 場所の名前 |
| `reason` | TEXT | 大事・好きな理由 |
| `latitude` | REAL | 緯度（自動取得） |
| `longitude` | REAL | 経度（自動取得） |
| `created_at` | TEXT | 作成日時 |

投稿数の上限（3 件）と本人のみアクセス可能な制御は API 層（`user_id` によるフィルタ）で担保しています。
