import os
import sys
import json
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.embedding import get_embedding
from src.pinecone_client import get_pinecone_index

load_dotenv()

def query_knowledge(query_text, namespace=None, top_k=3, filter=None):
    index = get_pinecone_index()
    
    try:
        query_vector = get_embedding(query_text)
        
        results = index.query(
            vector=query_vector,
            namespace=namespace,
            top_k=top_k,
            include_metadata=True,
            filter=filter
        )
        
        return results
    except Exception as e:
        print(f"Query failed: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/query_pinecone.py \"your query\" [namespace]")
        sys.exit(1)
        
    query = sys.argv[1]
    ns = sys.argv[2] if len(sys.argv) > 2 else None
    
    res = query_knowledge(query, namespace=ns)
    if res:
        print(f"\nQuery: {query}")
        print(f"Namespace: {ns or 'All'}")
        print("-" * 30)
        for match in res.matches:
            print(f"Score: {match.score:.4f}")
            print(f"Content: {match.metadata.get('content', '')[:200]}...")
            print("-" * 10)
