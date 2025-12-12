FROM python:3.9-slim

WORKDIR /app

# 1. ビルドツールとRustコンパイラをインストール
# sudachipyのビルドにはRust(cargo)が必要です
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    cargo \
    rustc \
    && rm -rf /var/lib/apt/lists/*

# 2. pipを最新化 (古いpipだとホイールの検出に失敗することがあるため)
RUN pip install --upgrade pip

# 3. ライブラリのインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. GiNZAモデルはpip install ja-ginzaでインストールされるため、追加のダウンロードは不要
# RUN python -m spacy download ja_core_news_lg

# アプリケーションコードのコピー
COPY main.py .

# 実行
CMD ["python", "-u", "main.py"]