import os
import time
import spacy
import numpy as np
from pymongo import MongoClient
from bson.objectid import ObjectId

# --- 環境設定 ---
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://root:password@db:27017/db_badslido?authSource=admin")
DB_NAME = os.getenv("MONGODB_DB", "db_badslido")
COL_MESSAGES = "messages"
COL_CORRELATIONS = "correlations"

# --- 1. NLPモデルのロード ---
print("Loading NLP model...", flush=True)
try:
    nlp = spacy.load('ja_core_news_lg')
except OSError:
    # Dockerビルド時にダウンロードしていない場合のフォールバック（推奨はビルド時に含む）
    from spacy.cli import download
    download("ja_core_news_lg")
    nlp = spacy.load('ja_core_news_lg')
print("Model loaded.", flush=True)

# --- 2. クラスター管理クラス ---
class OpinionCluster:
    def __init__(self, first_word, vector):
        self.word_counts = {first_word: 1}
        self.sum_vector = vector
        self.count = 1
        self._current_rep = first_word # 現在の代表単語を記憶

    def add(self, word, vector):
        self.word_counts[word] = self.word_counts.get(word, 0) + 1
        self.sum_vector += vector
        self.count += 1
    
    @property
    def representative(self):
        # 最もカウントが多い単語を返す
        return max(self.word_counts, key=self.word_counts.get)

    @property
    def center_vector(self):
        return self.sum_vector / self.count

    @property
    def current_rep_cache(self):
        return self._current_rep

    def update_rep_cache(self):
        self._current_rep = self.representative

# --- 3. システム本体 ---
class OpinionBoxSystem:
    def __init__(self, db, threshold=0.65):
        self.db = db
        self.clusters = []
        self.threshold = threshold
        # 最後に処理したメッセージのIDを保持（再起動時は最初から読み直すか、永続化するか選択可能）
        # 今回はシンプルにするため、起動時に既存データを全読み込みし、その後新着を監視します
        self.last_id = None

    def process_word(self, word):
        doc = nlp(word)
        if not doc.has_vector:
            return # ベクトル化できない単語はスキップ、あるいは「その他」扱い

        new_vec = doc.vector
        best_cluster = None
        max_score = -1.0

        # 既存クラスターとの比較
        for cluster in self.clusters:
            vec_a = new_vec
            vec_b = cluster.center_vector
            similarity = np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
            
            if similarity > self.threshold and similarity > max_score:
                max_score = similarity
                best_cluster = cluster

        # DB更新処理
        if best_cluster:
            # --- 既存グループへの統合 ---
            old_rep = best_cluster.current_rep_cache
            best_cluster.add(word, new_vec)
            new_rep = best_cluster.representative
            
            # DB同期: 代表が変わった場合、古い方を消して新しい方を入れる
            if old_rep != new_rep:
                self.db[COL_CORRELATIONS].delete_one({"word": old_rep})
            
            # Upsertで更新
            self.db[COL_CORRELATIONS].update_one(
                {"word": new_rep},
                {"$set": {"weight": best_cluster.count}},
                upsert=True
            )
            # キャッシュ更新
            best_cluster.update_rep_cache()
            print(f"Updated cluster: {old_rep} -> {new_rep} ({best_cluster.count})", flush=True)

        else:
            # --- 新規グループ作成 ---
            new_cluster = OpinionCluster(word, new_vec)
            self.clusters.append(new_cluster)
            
            self.db[COL_CORRELATIONS].insert_one({
                "word": word,
                "weight": 1
            })
            print(f"Created cluster: {word}", flush=True)

    def run(self):
        print("System started. Listening for messages...", flush=True)
        
        # 起動時に correlations をリセットしたい場合はコメントアウトを外す
        # self.db[COL_CORRELATIONS].delete_many({}) 

        while True:
            # 未処理のメッセージを取得
            query = {}
            if self.last_id:
                query = {"_id": {"$gt": self.last_id}}
            
            # 古い順に取得
            cursor = self.db[COL_MESSAGES].find(query).sort("_id", 1)
            
            count = 0
            for doc in cursor:
                word = doc.get("word")
                if word:
                    self.process_word(word)
                self.last_id = doc["_id"]
                count += 1
            
            if count == 0:
                time.sleep(1) # 新着がない場合は少し待つ

# --- Main Entry ---
if __name__ == "__main__":
    # DB接続待機 (簡易的なリトライ処理)
    client = None
    for i in range(10):
        try:
            client = MongoClient(MONGO_URI)
            client.admin.command('ping')
            print("Connected to MongoDB", flush=True)
            break
        except Exception as e:
            print(f"Waiting for MongoDB... ({e})", flush=True)
            time.sleep(2)
    
    if client:
        db = client[DB_NAME]
        system = OpinionBoxSystem(db)
        system.run()