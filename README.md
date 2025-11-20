# BadSlido

MongoDB をバックエンドとした Next.js  のワードクラウドダッシュボードです。サーバーサイドレンダリング (SSR) により、初期表示時から MongoDB のデータが描画されます。

## 機能

- 📊 リアルタイムでワードクラウドを可視化
- 🎨 weight に基づいた動的なフォントサイズ
- ➕ REST API 経由で新しい単語を追加
- 🐳 Docker Compose で簡単にセットアップ
- ⚡ Bun ランタイムで高速な開発体験
- 🌐 Cloudflare Tunnel でローカル環境を外部公開

## プロジェクト構成

```
BadSlido/
├── bun/                      # Next.js アプリケーション
│   ├── app/
│   │   ├── api/todos/        # REST API エンドポイント
│   │   ├── globals.css       # グローバルスタイル
│   │   ├── layout.tsx        # ルートレイアウト
│   │   └── page.tsx          # トップページ (SSR)
│   ├── components/
│   │   ├── TodosClient.tsx   # クライアントサイドロジック
│   │   └── WordCloudCanvas.tsx # SVG ワードクラウド描画
│   ├── lib/
│   │   ├── mongodb.ts        # MongoDB 接続
│   │   └── todos.ts          # データアクセス層
│   ├── types/
│   │   └── todo.ts           # 型定義
│   ├── start-with-tunnel.sh  # Cloudflare Tunnel 起動スクリプト
│   ├── Dockerfile
│   └── package.json
├── mongoDB/                  # MongoDB コンテナ設定
│   ├── Dockerfile
│   └── mongo_db.js           # 初期化スクリプト
└── docker-compose.yml
```

## セットアップ

### 1. Docker Compose で起動（推奨）

```bash
# リポジトリをクローン
git clone <repository-url>
cd BadSlido

# Docker Compose で起動
docker-compose up
```

http://localhost:3000 にアクセスすると、アプリケーションが表示されます。

## API エンドポイント

### GET `/api/todos`
全ての単語データを取得します。

**レスポンス例:**
```json
[
  { "_id": "...", "word": "Network", "weight": 42 },
  { "_id": "...", "word": "Cloud", "weight": 38 }
]
```

### POST `/api/todos`
新しい単語を追加します。

**リクエストボディ:**
```json
{
  "word": "Database",
  "weight": 35
}
```

**レスポンス:**
```json
{
  "_id": "...",
  "word": "Database",
  "weight": 35
}
```

## コマンド一覧

| コマンド        | 説明                       |
| --------------- | -------------------------- |
| `bun run dev`   | 開発サーバーを起動         |
| `bun run build` | 本番用ビルドを生成         |
| `bun run start` | 本番ビルドを起動           |
| `bun run lint`  | ESLint を実行              |

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React 18
- **ランタイム**: Bun
- **データベース**: MongoDB
- **スタイリング**: CSS Modules
- **型システム**: TypeScript
- **コンテナ**: Docker & Docker Compose
