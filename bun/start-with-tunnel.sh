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

# localtunnelで外部公開
echo "🌐 Starting localtunnel..."
echo ""
echo "═══════════════════════════════════════════════════════════"
npx localtunnel --port 3000 --subdomain badslido 2>&1 | while read line; do
    echo "$line"
    if echo "$line" | grep -q "your url is:"; then
        URL=$(echo "$line" | grep -o 'https://[^ ]*')
        echo "═══════════════════════════════════════════════════════════"
        echo "✅ BadSlido is now publicly accessible at:"
        echo "   $URL"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
    fi
done &
LT_PID=$!

# クリーンアップ処理
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $NEXT_PID 2>/dev/null
    kill $LT_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# プロセスを待機
wait
