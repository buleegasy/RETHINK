import os
import json
import sys
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.embedding import get_embedding
from src.pinecone_client import get_pinecone_index

load_dotenv()

def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)

def ingest(path, namespace):
    print(f"Starting ingestion for {path} into namespace {namespace}...")
    index = get_pinecone_index()
    
    batch = []
    count = 0
    for item in load_jsonl(path):
        text = item["content"]
        metadata = {
            "chunk_id": item["chunk_id"],
            "source_type": item["source_type"],
            "target_audience": item["target_audience"],
            "keywords": item["keywords"],
            "summary": item["summary"],
            "content": text,
            **item.get("metadata", {})
        }

        try:
            vector = get_embedding(text)
            batch.append({
                "id": item["chunk_id"],
                "values": vector,
                "metadata": metadata
            })
            count += 1
            
            if len(batch) >= 20: # Smaller batch for safety
                index.upsert(vectors=batch, namespace=namespace)
                print(f"Upserted {count} vectors...")
                batch = []
        except Exception as e:
            print(f"Error processing item {item.get('chunk_id')}: {e}")

    if batch:
        index.upsert(vectors=batch, namespace=namespace)
        print(f"Upserted final batch. Total: {count} vectors.")

if __name__ == "__main__":
    data_map = {
        "data/cleaned/cbt_chunks.jsonl": "cbt",
        "data/cleaned/policy_chunks.jsonl": "policy",
        "data/cleaned/dialogue_chunks.jsonl": "dialogue",
        "data/cleaned/safety_chunks.jsonl": "safety",
        "data/cleaned/clinical_authoritative_chunks.jsonl": "clinical_authoritative",
        "data/cleaned/clinical_professional_theory_chunks.jsonl": "clinical_theory",
        "data/cleaned/synthetic_case_chunks.jsonl": "synthetic_case"
    }
    
    for path, ns in data_map.items():
        if os.path.exists(path):
            ingest(path, ns)
        else:
            print(f"Skipping {path}, file not found.")
