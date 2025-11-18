# jQWCloudv3.4.1

jQueryプラグイン - Word Cloud ジェネレーター (v3.4.1)

## プロジェクト構造

```
network_db/
├── Plugin/
│   └── jQWCloudv3.4.1.ts      # TypeScript変換版
├── Word Cloud/
│   └── js/
│       ├── index.js           # 元のデモファイル
│       └── index.ts           # TypeScript変換版
├── dist/                      # コンパイル後の出力先
├── index.html                 # デモページ
├── package.json
└── tsconfig.json
```

## セットアップ

### 依存関係のインストール

```bash
bun install
# または
npm install
```

### TypeScriptのコンパイル

```bash
# 一度だけビルド
bun run build

# 監視モード（ファイル変更時に自動再コンパイル）
bun run watch
```

## 使い方

1. TypeScriptファイルをコンパイル:
   ```bash
   bun run build
   ```

2. `index.html`をブラウザで開く

## TypeScript化の主な変更点

- **型安全性**: すべての変数と関数に型注釈を追加
- **Enum**: 定数をenumとして定義（SpaceType, AlignmentType）
- **Interface**: データ構造を明確に定義
  - `WordInput`: 単語の入力データ
  - `WordConfig`: Word クラスの設定
  - `CloudOptions`: プラグインのオプション
  - `SpaceData`: スペースデータの構造
- **Class化**: より構造化されたコード
- **jQuery型定義**: `@types/jquery`による型サポート

## 開発

TypeScriptファイルを編集する場合:

1. `Plugin/jQWCloudv3.4.1.ts` または `Word Cloud/js/index.ts` を編集
2. `bun run build` でコンパイル
3. ブラウザでリロード

## ライセンス

元のjQWCloudプラグインのライセンスに準拠
