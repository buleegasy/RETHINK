import os
import sys
from dotenv import load_dotenv

# Path handling for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from embedding import get_embedding
from pinecone_client import get_pinecone_index

load_dotenv()

def query_knowledge(query_text, namespace=None, top_k=3, filter=None):
    """
    Core retrieval function to be used by the agent.
    """
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
