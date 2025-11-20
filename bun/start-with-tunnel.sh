#!/bin/sh

# 依存関係をインストール
echo "📦 Installing dependencies..."
bun install

# Next.jsサーバーをバックグラウンドで起動
echo "🚀 Starting Next.js server..."
bun run dev &
NEXT_PID=$!

# Next.jsが起動するまで待機
echo "⏳ Waiting for Next.js to start..."
sleep 5

# Cloudflare Tunnelで外部公開
echo "🌐 Starting Cloudflare Tunnel..."
echo ""
echo "═══════════════════════════════════════════════════════════"
bunx cloudflared tunnel --url http://localhost:3000 &
TUNNEL_PID=$!

# クリーンアップ処理
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $NEXT_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# プロセスを待機
wait
