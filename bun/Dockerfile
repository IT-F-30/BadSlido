# ベースイメージ
FROM oven/bun:latest

# CA証明書をインストール (SSL接続エラー対策)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /project

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# 起動スクリプトに実行権限を付与
COPY start-with-tunnel.sh /project/
RUN chmod +x /project/start-with-tunnel.sh

# localtunnelを使って外部公開しながらNext.js開発サーバーを起動
CMD ["/project/start-with-tunnel.sh"]