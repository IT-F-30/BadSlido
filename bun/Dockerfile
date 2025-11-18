# ベースイメージ
FROM oven/bun:latest

WORKDIR /project

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# 依存関係をインストールしてNext.js開発サーバーを起動
CMD ["sh", "-c", "bun install && bun run dev"]