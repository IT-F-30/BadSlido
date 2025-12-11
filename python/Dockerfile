FROM python:3.9-slim

WORKDIR /app

# 必要なビルドツールをインストール
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ライブラリのインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# spaCyの日本語モデル(Large)をダウンロード
# これにより実行時にインターネット接続が不要になります
RUN python -m spacy download ja_core_news_lg

# アプリケーションコードのコピー
COPY main.py .

# 実行
CMD ["python", "-u", "main.py"]