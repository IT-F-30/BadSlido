# ベースイメージ
FROM oven/bun:latest

WORKDIR /project

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# 起動スクリプトに実行権限を付与
COPY start-with-tunnel.sh /project/
RUN chmod +x /project/start-with-tunnel.sh

# localtunnelを使って外部公開しながらNext.js開発サーバーを起動
CMD ["/project/start-with-tunnel.sh"]