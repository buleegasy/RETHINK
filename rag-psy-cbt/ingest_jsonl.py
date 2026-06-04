import os
import json
import requests
import argparse

# The deployed worker URL or local
API_URL = "https://re-think-agent-worker.buleegasy-6c8.workers.dev/api/knowledge/ingest"

def jsonl_to_markdown(filepath):
    """
    Convert a JSONL file containing chunks into a Markdown document
    that the backend's chunkDocument logic can parse natively.
    """
    lines = []
    title = os.path.basename(filepath).replace(".jsonl", "")
    lines.append(f"# {title}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for row in f:
            if not row.strip():
                continue
            item = json.loads(row)
            summary = item.get('summary', '知识片段')
            content = item.get('content', '')
            keywords = item.get('keywords', [])
            
            # Use the summary as a level 2 heading
            lines.append(f"\n## {summary}")
            if keywords:
                lines.append(f"**关键词**: {', '.join(keywords)}\n")
            lines.append(content)
            
    return title, "\n".join(lines)

def ingest_file(filepath):
    print(f"Processing {filepath}...")
    title, md_content = jsonl_to_markdown(filepath)
    
    payload = {
        "title": title,
        "content": md_content,
        "sourceFile": os.path.basename(filepath)
    }
    
    response = requests.post(API_URL, json=payload)
    if response.status_code == 200:
        print(f"✅ Successfully ingested {title}: {response.json()}")
    else:
        print(f"❌ Failed to ingest {title}: {response.text}")

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "data", "cleaned")
    for filename in os.listdir(data_dir):
        if filename.endswith(".jsonl"):
            filepath = os.path.join(data_dir, filename)
            ingest_file(filepath)
