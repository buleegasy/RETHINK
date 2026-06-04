import os
import time
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("INDEX_NAME", "psy-cbt-knowledge")
EMBED_DIM = 1024  # For BAAI/bge-large-zh-v1.5

def get_pinecone_index():
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY not found in environment variables.")
        
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists, create if not
    if INDEX_NAME not in pc.list_indexes().names():
        print(f"Creating index {INDEX_NAME}...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        # Wait for index to be ready
        while not pc.describe_index(INDEX_NAME).status['ready']:
            time.sleep(1)
        print("Index ready.")
        
    return pc.Index(INDEX_NAME)

if __name__ == "__main__":
    try:
        index = get_pinecone_index()
        stats = index.describe_index_stats()
        print(f"Successfully connected to index: {INDEX_NAME}")
        print(f"Index stats: {stats}")
    except Exception as e:
        print(f"Connection failed: {e}")
