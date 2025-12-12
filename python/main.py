import os
import time
import spacy
import numpy as np
from pymongo import MongoClient

# --- 環境設定 ---
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://root:password@db:27017/db_badslido?authSource=admin")
DB_NAME = os.getenv("MONGODB_DB", "db_badslido")
COL_MESSAGES = "messages"
COL_CORRELATIONS = "correlations"

print("Loading NLP model...", flush=True)
try:
    nlp = spacy.load('ja_ginza')
except:
    # 失敗時はエラーを表示して終了（Dockerfileで入れているはず）
    print("Error: Model 'ja_ginza' not found. Please ensure it is installed.", flush=True)
    raise
    # from spacy.cli import download
    # download("ja_ginza")
    # nlp = spacy.load('ja_ginza')
print("Model loaded.", flush=True)

class OpinionCluster:
    def __init__(self, first_word, vector):
        self.word_counts = {first_word: 1}
        # 単語ごとのベクトルを保持できるようにする (代表単語選出時に使用)
        self.word_vectors = {first_word: vector}
        # 必ずコピーして独立させる（参照渡しだと += で元の vector が書き換わるため）
        self.sum_vector = np.array(vector, dtype=vector.dtype)
        self.count = 1
        self._current_rep = first_word

    def add(self, word, vector):
        self.word_counts[word] = self.word_counts.get(word, 0) + 1
        # ベクトルを保存（上書きでもOK、基本的に同じ単語なら同じベクトル）
        self.word_vectors[word] = vector
        self.sum_vector += vector
        self.count += 1
    
    # 別のクラスターを自身に吸収合併するメソッド
    def merge_other(self, other_cluster):
        # カウントを合算
        for w, c in other_cluster.word_counts.items():
            self.word_counts[w] = self.word_counts.get(w, 0) + c
            # ベクトルも統合 (重複時はどちらでも良いが、念のため保持)
            if w in other_cluster.word_vectors:
                self.word_vectors[w] = other_cluster.word_vectors[w]
        
        # ベクトルを合算
        self.sum_vector += other_cluster.sum_vector
        self.count += other_cluster.count
    
    def get_log_string(self):
        # ${代表}:${size}[${ワード},${ワード},...]
        words_list = ",".join(self.word_counts.keys())
        return f"{self.representative}:{self.count}[{words_list}]"

    @property
    def representative(self):
        # 1. クラスター内の全単語を候補とする
        candidates = list(self.word_counts.keys())
        
        if len(candidates) == 1:
            return candidates[0]
        
        # 2. 重心（クラスターの平均ベクトル）に最も近い単語を選ぶ (ユークリッド距離)
        mean_vec = self.center_vector
        best_word = candidates[0]
        # 距離は小さい方が良いので無限大で初期化
        min_dist = float('inf')

        for w in candidates:
            w_vec = self.word_vectors.get(w)
            if w_vec is None: continue
            
            # ユークリッド距離を計算
            dist = np.linalg.norm(w_vec - mean_vec)
            
            if dist < min_dist:
                min_dist = dist
                best_word = w
                
        return best_word

    @property
    def center_vector(self):
        return self.sum_vector / self.count

    @property
    def current_rep_cache(self):
        return self._current_rep

    def update_rep_cache(self):
        self._current_rep = self.representative

class OpinionBoxSystem:
    # 閾値を 0.63 に設定 (ja_ginzaでの野菜-人参などの類似度 0.65 を考慮)
    def __init__(self, db, threshold=0.63):
        self.db = db
        self.clusters = []
        self.threshold = threshold
        self.last_id = None

    def _calculate_similarity(self, vec_a, vec_b):
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return np.dot(vec_a, vec_b) / (norm_a * norm_b)

    def process_word(self, word):
        doc = nlp(word)
        # ベクトルがない場合(OOV)でもスキップせず、独立した単語として登録する (ベクトルは0)
        if doc.has_vector:
            new_vec = doc.vector
        else:
            print(f"Warning: No vector for '{word}'. treating as unique.", flush=True)
            new_vec = np.zeros((300,), dtype=np.float32) 
            # The original instruction had this, but it's problematic if doc.has_vector is false.
            # if len(doc) > 0 and doc.vector.shape[0] > 0:
            #      new_vec = np.zeros(doc.vector.shape, dtype=doc.vector.dtype)

        best_cluster = None
        max_score = -1.0

        # 1. 既存クラスターへの所属チェック
        for cluster in self.clusters:
            score = self._calculate_similarity(new_vec, cluster.center_vector)
            
            # 救済措置: ベクトルがなくても、単語が完全に一致していればマージする
            if cluster.representative == word:
                score = 1.0
            
            if score > self.threshold and score > max_score:
                max_score = score
                best_cluster = cluster

        if best_cluster:
            # 既存に追加
            old_rep = best_cluster.current_rep_cache
            best_cluster.add(word, new_vec)
            new_rep = best_cluster.representative
            
            # DB更新 (名前が変わった場合)
            if old_rep != new_rep:
                self.db[COL_CORRELATIONS].delete_one({"word": old_rep})
                print(f"Renamed Cluster: '{old_rep}' -> '{new_rep}' (Triggered by '{word}', Score: {max_score:.2f}) -> {best_cluster.get_log_string()}", flush=True)
            else:
                print(f"Merged '{word}' into '{new_rep}' (Score: {max_score:.2f}) -> {best_cluster.get_log_string()}", flush=True)
            
            self.db[COL_CORRELATIONS].update_one(
                {"word": new_rep},
                {"$set": {"weight": best_cluster.count}},
                upsert=True
            )
            best_cluster.update_rep_cache()
        else:
            # 新規作成
            new_cluster = OpinionCluster(word, new_vec)
            self.clusters.append(new_cluster)
            self.db[COL_CORRELATIONS].insert_one({"word": word, "weight": 1})
            print(f"Created '{word}'", flush=True)

        # 2. 【重要】クラスター同士のマージ処理（お掃除タイム）
        self._merge_similar_clusters()

    def _merge_similar_clusters(self):
        # クラスターの数が減らなくなるまで繰り返す（AとBがくっつき、さらにCともくっつく可能性があるため）
        while True:
            merged_occurred = False
            clusters_to_remove = []
            
            # 総当たりでチェック (リストのコピーを使ってループ)
            # 効率は悪いですが単語数数千レベルならローカルで問題なく動きます
            current_clusters = self.clusters[:]
            skip_indices = set()

            for i in range(len(current_clusters)):
                if i in skip_indices: continue
                
                for j in range(i + 1, len(current_clusters)):
                    if j in skip_indices: continue

                    c1 = current_clusters[i]
                    c2 = current_clusters[j]

                    score = self._calculate_similarity(c1.center_vector, c2.center_vector)
                    
                    # グループ同士のマージは、単語単体よりも少し厳しめにするか、同じにするか
                    # ここでは同じ閾値を使います
                    if score > self.threshold:
                        # c2 を c1 に吸収させる
                        # ログ出力を統合前に出すか、統合後に出すか。統合後の状態が見たいので統合処理後にログを出すが、
                        # ここでは「こうなるよ」という予告として出すか、c1にmergeした後に出すか。
                        # ユーザー要望は今の状態を知りたいということなので、マージ後に詳細を出す方が親切。
                        
                        # DBから消える方の代表単語を削除
                        self.db[COL_CORRELATIONS].delete_one({"word": c2.representative})
                        
                        # マージ実行
                        old_rep_c1 = c1.current_rep_cache
                        c1.merge_other(c2)
                        new_rep_c1 = c1.representative

                        print(f"⚡ Cluster Merge: '{c2.representative}' -> '{old_rep_c1}' => Now '{new_rep_c1}' (Score: {score:.2f}) -> {c1.get_log_string()}", flush=True)

                        # DBに残る方の更新（名前が変わる可能性も考慮）

                        # DBに残る方の更新（名前が変わる可能性も考慮）
                        if old_rep_c1 != new_rep_c1:
                            self.db[COL_CORRELATIONS].delete_one({"word": old_rep_c1})
                        
                        self.db[COL_CORRELATIONS].update_one(
                            {"word": new_rep_c1},
                            {"$set": {"weight": c1.count}},
                            upsert=True
                        )
                        c1.update_rep_cache()

                        # ループ管理
                        clusters_to_remove.append(c2)
                        skip_indices.add(j)
                        merged_occurred = True

            # リストから削除済みクラスターを除去
            for c in clusters_to_remove:
                if c in self.clusters:
                    self.clusters.remove(c)

            # 一度もマージが起きなければ終了
            if not merged_occurred:
                break

    def run(self):
        print("System started. Listening...", flush=True)
        # 起動時に一度DBをクリーンアップしたい場合は以下を有効化
        self.db[COL_CORRELATIONS].delete_many({}) 

        while True:
            query = {}
            if self.last_id:
                query = {"_id": {"$gt": self.last_id}}
            
            cursor = self.db[COL_MESSAGES].find(query).sort("_id", 1)
            count = 0
            for doc in cursor:
                word = doc.get("word")
                if word:
                    self.process_word(word)
                self.last_id = doc["_id"]
                count += 1
            
            if count == 0:
                time.sleep(1)

if __name__ == "__main__":
    client = None
    for i in range(10):
        try:
            client = MongoClient(MONGO_URI)
            client.admin.command('ping')
            break
        except Exception:
            time.sleep(2)
    
    if client:
        # 閾値を 0.63 に設定 (ja_ginzaでの野菜-人参などの類似度 0.65 を考慮)
        system = OpinionBoxSystem(client[DB_NAME], threshold=0.63)
        system.run()