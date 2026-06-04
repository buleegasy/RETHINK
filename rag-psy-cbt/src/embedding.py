import os
import requests
from dotenv import load_dotenv

load_dotenv()

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-large-zh-v1.5")

def get_embedding(text):
    """
    Get embedding from SiliconFlow API.
    """
    if not SILICONFLOW_API_KEY:
        raise ValueError("SILICONFLOW_API_KEY not found in environment variables.")
        
    url = "https://api.siliconflow.cn/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {SILICONFLOW_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": EMBED_MODEL,
        "input": text
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    return data["data"][0]["embedding"]

if __name__ == "__main__":
    # Quick test
    try:
        test_text = "你好，我今天心情不太好。"
        vec = get_embedding(test_text)
        print(f"Test successful. Vector dimension: {len(vec)}")
    except Exception as e:
        print(f"Test failed: {e}")
