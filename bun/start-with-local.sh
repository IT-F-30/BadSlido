#!/bin/sh

# 依存関係をインストール
echo "📦 Installing dependencies..."
bun install

# Next.jsサーバーをバックグラウンドで起動
echo "🚀 Starting Next.js server..."
bun run dev &
NEXT_PID=$!

# プロセスを待機
wait
