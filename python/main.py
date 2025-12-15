import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from pymongo import MongoClient

# --- 環境設定 ---
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://root:password@db:27017/db_badslido?authSource=admin")
DB_NAME = os.getenv("MONGODB_DB", "db_badslido")
COL_MESSAGES = "messages"
COL_CORRELATIONS = "correlations"

# モデルのローカルキャッシュディレクトリ（環境変数で設定することで確実にキャッシュされる）
MODEL_CACHE_DIR = "/app/models"
MODEL_NAME = "intfloat/multilingual-e5-large"

# sentence-transformersとHugging Faceのキャッシュディレクトリを明示的に設定
os.environ["SENTENCE_TRANSFORMERS_HOME"] = MODEL_CACHE_DIR
os.environ["HF_HOME"] = MODEL_CACHE_DIR

# ディレクトリが存在しない場合は作成
os.makedirs(MODEL_CACHE_DIR, exist_ok=True)


class TextGrouper:
    """類似度に基づいて文字列をグループ化するクラス"""
    
    def __init__(self, model_name: str = MODEL_NAME, distance_threshold: float = 0.3):
        """
        Args:
            model_name: 使用するモデル名
            distance_threshold: クラスタリングの距離閾値 (0.0 - 2.0)
                               小さいほど厳密（グループ数が増える）
                               大きいほど緩い（グループ数が減る）
        """
        self.distance_threshold = distance_threshold
        print(f"Loading sentence-transformers model ({model_name})...", flush=True)
        print(f"Model cache directory: {MODEL_CACHE_DIR}", flush=True)
        self.model = SentenceTransformer(model_name, cache_folder=MODEL_CACHE_DIR)
        print("Model loaded successfully!", flush=True)
    
    def set_distance_threshold(self, threshold: float):
        """距離閾値を設定する（小さいほど厳密）"""
        if 0.0 <= threshold <= 2.0:
            self.distance_threshold = threshold
            print(f"Distance threshold updated to: {threshold}", flush=True)
        else:
            raise ValueError("Distance threshold must be between 0.0 and 2.0")
    
    def get_embeddings(self, texts: list[str]) -> np.ndarray:
        """文字列リストのembeddingsを取得"""
        # E5モデルはクエリに"query: "プレフィックスを推奨
        prefixed_texts = [f"query: {text}" for text in texts]
        return self.model.encode(prefixed_texts, normalize_embeddings=True)
    
    def calculate_similarity_matrix(self, texts: list[str]) -> np.ndarray:
        """文字列間の類似度マトリックスを計算"""
        embeddings = self.get_embeddings(texts)
        return cosine_similarity(embeddings)
    
    def group_texts_hierarchical(self, texts: list[str], n_clusters: int = None) -> list[list[str]]:
        """
        階層的クラスタリングでグループ化
        
        Args:
            texts: グループ化する文字列のリスト
            n_clusters: クラスタ数を指定（Noneの場合はdistance_thresholdを使用）
            
        Returns:
            グループ化された文字列のリストのリスト
        """
        if not texts:
            return []
        if len(texts) == 1:
            return [texts]
        
        embeddings = self.get_embeddings(texts)
        
        # 階層的クラスタリング
        if n_clusters is not None:
            clustering = AgglomerativeClustering(
                n_clusters=n_clusters,
                metric='cosine',
                linkage='average'
            )
        else:
            clustering = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=self.distance_threshold,
                metric='cosine',
                linkage='average'
            )
        
        labels = clustering.fit_predict(embeddings)
        
        # グループを構築
        groups = {}
        for i, label in enumerate(labels):
            if label not in groups:
                groups[label] = []
            groups[label].append(texts[i])
        
        return list(groups.values())
    
    def group_texts_dbscan(self, texts: list[str], eps: float = 0.3, min_samples: int = 1) -> list[list[str]]:
        """
        DBSCANクラスタリングでグループ化（外れ値検出が可能）
        
        Args:
            texts: グループ化する文字列のリスト
            eps: 近傍の距離閾値
            min_samples: クラスタを形成する最小サンプル数
            
        Returns:
            グループ化された文字列のリストのリスト
        """
        if not texts:
            return []
        if len(texts) == 1:
            return [texts]
        
        embeddings = self.get_embeddings(texts)
        
        # cosine距離に変換（1 - cosine_similarity）
        # 浮動小数点誤差で負の値が発生する可能性があるためクリップ
        distance_matrix = np.clip(1 - cosine_similarity(embeddings), 0, 2)
        
        clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='precomputed')
        labels = clustering.fit_predict(distance_matrix)
        
        # グループを構築（-1はノイズ/外れ値）
        groups = {}
        outliers = []
        for i, label in enumerate(labels):
            if label == -1:
                outliers.append(texts[i])
            else:
                if label not in groups:
                    groups[label] = []
                groups[label].append(texts[i])
        
        result = list(groups.values())
        # 外れ値は個別グループとして追加
        for outlier in outliers:
            result.append([outlier])
        
        return result
    
    def print_groups(self, texts: list[str], method: str = "hierarchical", n_clusters: int = None, eps: float = None):
        """グループ化結果をコンソールに表示
        
        Args:
            texts: グループ化する文字列のリスト
            method: "hierarchical" または "dbscan"
            n_clusters: 階層的クラスタリングでクラスタ数を指定
            eps: DBSCANの距離閾値
        """
        print("\n" + "=" * 50)
        print(f"Input texts ({len(texts)} items):")
        print("-" * 50)
        for text in texts:
            print(f"  - {text}")
        
        print("\n" + "=" * 50)
        
        if method == "hierarchical":
            if n_clusters:
                print(f"Hierarchical Clustering (n_clusters: {n_clusters}):")
            else:
                print(f"Hierarchical Clustering (distance_threshold: {self.distance_threshold}):")
            groups = self.group_texts_hierarchical(texts, n_clusters)
        elif method == "dbscan":
            eps_val = eps if eps else self.distance_threshold
            print(f"DBSCAN Clustering (eps: {eps_val}):")
            groups = self.group_texts_dbscan(texts, eps=eps_val)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        print("-" * 50)
        
        for i, group in enumerate(groups, 1):
            print(f"\nGroup {i} ({len(group)} items):")
            for text in group:
                print(f"  - {text}")
        
        print("\n" + "=" * 50)
        print(f"Total: {len(groups)} groups from {len(texts)} items")
        print("=" * 50)
        
        return groups
    
    def print_similarity_matrix(self, texts: list[str]):
        """類似度マトリックスを表示（デバッグ用）"""
        similarity_matrix = self.calculate_similarity_matrix(texts)
        
        print("\n" + "=" * 50)
        print("Similarity Matrix:")
        print("-" * 50)
        
        # ヘッダー
        max_len = max(len(t) for t in texts)
        header = " " * (max_len + 2)
        for i, text in enumerate(texts):
            header += f"{i:>6}"
        print(header)
        
        # 各行
        for i, text in enumerate(texts):
            row = f"{text:<{max_len}}  "
            for j in range(len(texts)):
                row += f"{similarity_matrix[i][j]:>6.2f}"
            print(row)
        
        print("=" * 50)


def main():
    """
    MongoDBからメッセージを読み込み、グループ化して結果を保存（無限ループ）
    """
    import time
    
    # ポーリング間隔（秒）
    POLL_INTERVAL = 5
    
    # MongoDB接続
    print(f"Connecting to MongoDB: {MONGO_URI}", flush=True)
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    messages_col = db[COL_MESSAGES]
    correlations_col = db[COL_CORRELATIONS]
    
    # グルーパーを初期化（最初に1回だけ）
    print("Initializing TextGrouper...", flush=True)
    grouper = TextGrouper(distance_threshold=0.174)
    
    # 前回処理したメッセージ数を記録（変更検出用）
    last_message_count = -1
    last_message_hash = None
    
    print(f"\nStarting infinite loop (polling every {POLL_INTERVAL}s)...", flush=True)
    print("=" * 50, flush=True)
    
    while True:
        try:
            # messagesコレクションからデータを取得
            messages = list(messages_col.find({}, {"_id": 1, "word": 1}))
            
            # メッセージのハッシュを計算（変更検出用）
            current_hash = hash(tuple((str(m["_id"]), m["word"]) for m in messages)) if messages else None
            
            # 変更がない場合はスキップ
            if current_hash == last_message_hash:
                time.sleep(POLL_INTERVAL)
                continue
            
            last_message_hash = current_hash
            
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Detected change in messages", flush=True)
            print(f"Reading from {DB_NAME}.{COL_MESSAGES}...", flush=True)
            
            if not messages:
                print("No messages found. Waiting...", flush=True)
                time.sleep(POLL_INTERVAL)
                continue
            
            print(f"Found {len(messages)} messages:", flush=True)
            for msg in messages:
                print(f"  {msg['_id']}, {msg['word']}", flush=True)
            
            # テキストのリストとIDのマッピングを作成
            words = [msg["word"] for msg in messages]
            ids = [str(msg["_id"]) for msg in messages]
            
            # グループ化を実行
            print("\nGrouping texts...", flush=True)
            groups = grouper.group_texts_hierarchical(words)
            
            # 結果を表示
            print(f"\n{'='*50}")
            print(f"Grouping Results:")
            print(f"{'-'*50}")
            
            # correlationsに保存するデータを準備
            correlation_docs = []
            
            for group_idx, group in enumerate(groups, 1):
                sum_items = len(group)
                print(f"\nGroup {group_idx} ({sum_items} items):")
                
                for word in group:
                    # このwordに対応するすべてのIDを取得
                    matching_ids = [id for id, w in zip(ids, words) if w == word]
                    for msg_id in matching_ids:
                        print(f"  {msg_id}, {word}, {sum_items}", flush=True)
                        correlation_docs.append({
                            "word": word,
                            "weight": sum_items
                        })
            
            print(f"\n{'='*50}")
            print(f"Total: {len(groups)} groups from {len(messages)} items")
            print(f"{'='*50}")
            
            # correlationsコレクションをクリアして新しいデータを挿入
            print(f"\nClearing {DB_NAME}.{COL_CORRELATIONS}...", flush=True)
            correlations_col.delete_many({})
            
            print(f"Inserting {len(correlation_docs)} documents to {DB_NAME}.{COL_CORRELATIONS}...", flush=True)
            if correlation_docs:
                correlations_col.insert_many(correlation_docs)
            
            print("Done! Waiting for next change...", flush=True)
            
        except Exception as e:
            print(f"Error: {e}", flush=True)
            print("Retrying in 5 seconds...", flush=True)
        
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
