"""
scripts/split_and_reingest.py  (v2)

从原始 JSONL 中找出超长 chunk，按 Token 安全阈值切分后重新 embed 并入库。

bge-large-zh-v1.5 硬限制：512 tokens
中文混合文本实测：~250 汉字 + 标点 + 英文 ≈ 510 tokens（保守取 220 汉字上限）
"""

import os, sys, json, glob
import requests
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from src.pinecone_client import get_pinecone_index

load_dotenv()

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-large-zh-v1.5")

# 实测安全上限：220 个汉字 + 标点约 250 字符
# 使用 300 作为字符数上限，确保不超 512 tokens
MAX_CHARS = 300

SOURCE_DIR = "/Users/chenhaoran/Documents/New project/data/cleaned"

FAILED_IDS = {
    "cbt_burns_ten_distortions_005":          ("cbt_chunks.jsonl", "cbt"),
    "cbt_rag_fact_separation_algorithm_006":  ("cbt_chunks.jsonl", "cbt"),
    "policy_mhe_2012_core_principles_001":    ("policy_chunks.jsonl", "policy"),
    "policy_mhe_action_plan_2023_2025_001":   ("policy_chunks.jsonl", "policy"),
    "dialogue_smile_gaokao_exam_anxiety_002": ("dialogue_chunks.jsonl", "dialogue"),
    "dialogue_open_dataset_governance_004":   ("dialogue_chunks.jsonl", "dialogue"),
}


def embed(text):
    resp = requests.post(
        "https://api.siliconflow.cn/v1/embeddings",
        json={"model": EMBED_MODEL, "input": text},
        headers={"Authorization": f"Bearer {SILICONFLOW_API_KEY}",
                 "Content-Type": "application/json"},
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def split_content(content, max_chars=MAX_CHARS):
    """
    按句子/段落切分，每块不超过 max_chars 字符。
    优先在换行符处切，其次在句号处切。
    """
    import re
    # 先按段落切
    paragraphs = [p.strip() for p in content.split("\n") if p.strip()]
    chunks = []
    current = ""

    for para in paragraphs:
        # 如果这一段本身就超长，先在句号处切
        while len(para) > max_chars:
            # 找最近的句末标点
            cut = max_chars
            for punct in "。！？…":
                idx = para.rfind(punct, 0, max_chars)
                if idx > 0 and idx > cut - 50:
                    cut = idx + 1
                    break
            if current:
                chunks.append(current)
                current = ""
            chunks.append(para[:cut])
            para = para[cut:].strip()

        if len(current) + len(para) + 1 <= max_chars:
            current += ("\n" if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = para

    if current:
        chunks.append(current)

    return [c for c in chunks if c.strip()]


def load_original(chunk_id, filename):
    path = os.path.join(SOURCE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            if data["chunk_id"] == chunk_id:
                return data
    return None


def reingest():
    index = get_pinecone_index()

    for chunk_id, (filename, namespace) in FAILED_IDS.items():
        print(f"\n处理: {chunk_id} (namespace={namespace})")
        item = load_original(chunk_id, filename)
        if not item:
            print(f"  ⚠ 找不到原始数据，跳过。")
            continue

        content = item["content"]
        sub_chunks = split_content(content)
        print(f"  原始长度: {len(content)} 字符 → 切分为 {len(sub_chunks)} 个子块")

        vectors = []
        local_rows = []
        for i, text in enumerate(sub_chunks):
            sub_id = f"{chunk_id}_sub{i+1:02d}"
            print(f"  尝试: {sub_id} ({len(text)} 字符)", end=" ")
            try:
                vec = embed(text)
                metadata = {
                    "chunk_id": sub_id,
                    "parent_chunk_id": chunk_id,
                    "source_type": item["source_type"],
                    "target_audience": item["target_audience"],
                    "keywords": item["keywords"],
                    "summary": item["summary"],
                    "content": text,
                    **item.get("metadata", {})
                }
                vectors.append({"id": sub_id, "values": vec, "metadata": metadata})
                local_rows.append({
                    "chunk_id": sub_id,
                    "source_type": item["source_type"],
                    "target_audience": item["target_audience"],
                    "keywords": item["keywords"],
                    "summary": item["summary"],
                    "content": text,
                    "metadata": {"parent_chunk_id": chunk_id, **item.get("metadata", {})}
                })
                print("✓")
            except Exception as e:
                print(f"✗ ({e})")

        if vectors:
            index.upsert(vectors=vectors, namespace=namespace)
            print(f"  → 入库 {len(vectors)} 个子块到 namespace={namespace}")

            # 写回本地 JSONL
            local_path = f"data/cleaned/{filename}"
            with open(local_path, "a", encoding="utf-8") as f:
                for row in local_rows:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"  → 已追加到 {local_path}")
        else:
            print(f"  ⚠ 所有子块均失败，请检查内容。")


if __name__ == "__main__":
    reingest()
