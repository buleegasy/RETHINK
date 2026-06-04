# Psychological Support RAG Knowledge Base

A RAG (Retrieval-Augmented Generation) system designed for adolescent psychological support using CBT principles and Llama 3.3.

## Features

- **Intent Routing**: Automatically distinguish between small talk, emotional venting, and crisis signals.
- **CBT ABC Extraction**: Structured analysis of user input into Facts (A), Beliefs (B), and Consequences (C).
- **Adolescent-Specific Knowledge**: Tailored content for school, peer, and family stressors.
- **Crisis Detection**: High-priority identification of risk signals with referral protocols.

## Tech Stack

- **LLM**: Llama 3.3 70B (via SiliconFlow)
- **Embedding**: BAAI/bge-large-zh-v1.5
- **Vector DB**: Pinecone
- **Backend**: Python 3.9+

## Getting Started

1. Copy `.env.example` to `.env` and fill in your API keys.
2. Install dependencies:
   ```bash
   pip install pinecone-client python-dotenv requests
   ```
3. Prepare data in `data/cleaned/`.
4. Run ingestion:
   ```bash
   python scripts/ingest_pinecone.py
   ```

## Directory Structure

- `data/`: Raw and processed JSONL chunks.
- `docs/`: Core rules and theoretical documentation.
- `scripts/`: Data validation and ingestion scripts.
- `src/`: Core logic for embeddings, Pinecone interaction, and prompt building.
