import spacy
import numpy as np

try:
    nlp = spacy.load('ja_ginza')
    print("Loaded ja_ginza")
except:
    print("Failed to load ja_ginza")
    exit(1)

words = ["玉ねぎ", "たまねぎ", "タマネギ", "ネギ", "ねぎ", "葱", "カモネギ", "鴨葱"]

docs = {w: nlp(w) for w in words}

print("-" * 30)
for w in words:
    token = docs[w][0] if len(docs[w]) > 0 else None
    if not docs[w].has_vector:
        print(f"{w}: No Vector (Lemma: {token.lemma_ if token else 'None'})")
    else:
        print(f"{w}: Has Vector (Lemma: {token.lemma_ if token else 'None'})")

print("-" * 30)
pairs = [
    ("野菜", "人参"),
    ("野菜", "大根"),
    ("野菜", "アスパラガス"),
    ("人参", "大根"),
    ("桶", "バケツ"),
    ("桶", "樽"),
    ("桶", "容器"),
    ("バケツ", "容器"),
]

for w1, w2 in pairs:
    if docs[w1].has_vector and docs[w2].has_vector:
        sim = docs[w1].similarity(docs[w2])
        print(f"{w1} - {w2}: {sim:.4f}")
    else:
        print(f"{w1} - {w2}: Cannot calculate (missing vector)")
