import spacy
import numpy as np
import sys
import os

sys.path.append('/app')
from main import OpinionCluster

print("Loading NLP model...")
nlp = spacy.load('ja_ginza')

def get_vec(word):
    doc = nlp(word)
    return doc.vector

print("--- Test: Count Unbiased Selection ---")
# Use the Vegetable set again.
# "Vegetable" has lower norm (3.8) than "Hakusai" (4.3).
# "Hakusai" SimToMean was 0.93 vs Vegetable 0.86.
# Even with unbiased count, "Hakusai" should win based on vector.
# BUT, let's verify that increasing count of "Daikon" does NOT make "Daikon" win if "Hakusai" is better.

c = OpinionCluster("人参", get_vec("人参"))
c.add("大根", get_vec("大根")) 
c.add("大根", get_vec("大根")) # Daikon count = 2
c.add("野菜", get_vec("野菜"))
c.add("白菜", get_vec("白菜")) # Hakusai count = 1

print(f"Cluster Counts: {c.word_counts}")
# Mean vector will be pulled towards Daikon because Daikon is there twice.
# Rep should be chosen from [Carrot, Daikon, Vegetable, Hakusai].
# Closest to (Mean of 2*Daikon + others)?
# Daikon might actually become closer to Mean because the Mean shifts towards it.
# BUT, the restriction "Must be Max Count" is gone.
# If Hakusai is still mathematically closer to the shifted mean, it will win.

rep = c.representative
print(f"Representative: {rep}")
print(f"Log String: {c.get_log_string()}")

print("\n--- Test: Pure Centrality ---")
# Create a balanced cluster where Center is clearly C, but A has high count.
# Vectors: A=[10,0], B=[-10,0], C=[0,0]. Mean=[0,0] (if balanced).
# A count = 100. B count = 1. C count = 1.
# Mean will be ~[9.something, 0]. A will be closest.
# This implies Frequency still affects the Mean.
# This is desirable (Representative of the CROWD).
# But if we have [1,0], [-1,0], [0,0] (counts 1 each). Mean=[0,0]. C wins.
vA = np.array([1.0, 0.0], dtype=np.float32)
vB = np.array([-1.0, 0.0], dtype=np.float32)
vC = np.array([0.0, 0.0], dtype=np.float32)

c2 = OpinionCluster("A", vA)
c2.add("B", vB)
c2.add("C", vC)
print(f"Balanced (1 each). Rep should be C. Result: {c2.representative}")

c2.add("A", vA) # A count 2.
# Mean = (2A + B + C)/4 = (2-1+0)/4 = 0.25.
# Distances to 0.25:
# A(1.0): 0.75
# B(-1.0): 1.25
# C(0.0): 0.25 -> C is still closest!
print(f"Skewed (A=2, B=1, C=1). Mean=0.25. C(0) dist 0.25, A(1) dist 0.75. Rep should be C. Result: {c2.representative}")

# Extreme Skew
for _ in range(10): c2.add("A", vA)
# A count ~ 12.
# Mean -> approaches 1.0.
# Only when Mean > 0.5 does A become closer than C.
print(f"Heavily Skewed (A many). Result: {c2.representative}")
print(f"Log: {c2.get_log_string()}")
