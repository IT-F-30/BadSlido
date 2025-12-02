# ベースイメージ
FROM oven/bun:latest

# CA証明書をインストール (SSL接続エラー対策)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /project

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# dev専用スクリプト
COPY start-with-local.sh /project/
RUN chmod +x /project/start-with-local.sh
CMD ["/project/start-with-local.sh"]

# # 起動スクリプト
# COPY start-with-tunnel.sh /project/
# RUN chmod +x /project/start-with-tunnel.sh
# CMD ["/project/start-with-tunnel.sh"]