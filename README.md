# RE-THINK Agent: Cognitive Behavioral Therapy (CBT) AI Companion

RE-THINK Agent is an AI-powered conversational platform designed to support cognitive restructuring and emotional well-being using the principles of Cognitive Behavioral Therapy (CBT). Specifically optimized for adolescent support, the agent is engineered to guide users through structured cognitive restructuring while providing human-like warmth, safety-first protocols, and robust crisis detection.

The application leverages a modern, low-latency, and edge-native serverless architecture deployed on Cloudflare Pages and Workers, coupled with advanced Retrieval-Augmented Generation (RAG) to ground its support in verified clinical guidelines.

---

## 🌟 Key Features

### 1. Structured CBT 5-Stage State Machine
The agent gently guides users through the core stages of CBT cognitive reframing. Each stage is visually represented in the user interface with specific themes:
- **Stage 1: Fact Gathering (剥离事实)** - Identifying the objective trigger (`#4FC3F7` Ice Blue).
- **Stage 2: Thought Catching (捕获想法)** - Identifying automatic thoughts and underlying beliefs (`#81C784` Sage Green).
- **Stage 3: Cognitive Distortion Scanning (扫描漏洞)** - Detecting logical fallacies and cognitive distortions (`#FFB74D` Warm Amber).
- **Stage 4: Evidentiary Examination (证据质询)** - Validating thoughts against objective evidence (`#E57373` Coral Red).
- **Stage 5: Cognitive Restructuring (重构认知)** - Constructing balanced, adaptive thoughts (`#CE93D8` Soft Purple).

### 2. Intelligent Intent Routing
All user inputs are classified by a lightweight intent classifier to tailor the conversational flow:
- **Casual (闲聊)**: General conversation and rapport building.
- **Emotional Venting (倾诉)**: Normal emotional stress that triggers RAG-augmented CBT support.
- **Crisis (危机)**: Immediate suspension of CBT protocols to prioritize crisis intervention and safety referrals.
- **Ambiguous (模糊)**: Conversational prompts requiring clarifying follow-ups.

### 3. Emotion-First Architecture
Unlike rigid clinical bots, RE-THINK Agent prioritizes **emotional validation and safety**. When high levels of distress or sadness are detected, the agent immediately pauses logical CBT exercises to provide genuine empathy and emotional backing, transitioning back only when the user is ready.

### 4. Edge-Native Retrieval-Augmented Generation (RAG)
Contextualized prompt injection using vector search on top-tier psychological rulesets, adolescent mental health guidelines, and clinical prompt structures.

---

## 🏗️ System Architecture

```
User Browser
    │
    ▼
Cloudflare Pages (Static React Web App)
    │  /api/* (Proxy Routing)
    ▼
Cloudflare Workers (Hono API Server on Edge)
    │
    ├─────────────┬─────────────┐
    ▼             ▼             ▼
Intent Router   Workers AI    OpenRouter API
(Code Classifier) (BGE Embedding) (Llama 3.3 70B)
                  ▼
          Cloudflare Vectorize (Knowledge Base Index)
                  ▼
          Cloudflare D1 (Session & Audit Logs Metadata)
```

---

## 📁 Repository Structure

```
re-think-agent/
├── web/                   # Vite + React + Tailwind CSS client
│   ├── src/               # React components, stores (Zustand), and hooks
│   └── wrangler.toml      # Config for Cloudflare Pages hosting
├── worker/                # Hono server running on Cloudflare Workers
│   ├── src/               # API routes, prompt engine, RAG client, and state check
│   └── wrangler.toml      # Config for D1, Vectorize, and worker bindings
├── rag-psy-cbt/           # Python ingest pipeline for Populating Pinecone/Vectorize
│   ├── data/              # Cleaned training/knowledge JSONL datasets
│   └── scripts/           # Ingestion scripts
├── LICENSE                # MIT License
└── plan.md                # Technical Architecture Roadmap
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+ (for RAG data ingestion)
- Cloudflare Wrangler CLI configured with your account

### 1. Setup Backend (Worker)
Navigate to `/worker`:
```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
# Add your OPENROUTER_API_KEY / SILICONFLOW_API_KEY
npm run dev
```

### 2. Setup Frontend (Web App)
Navigate to `/web`:
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:5173` to interact with the development server.

### 3. Populating the Knowledge Base (Optional)
Navigate to `/rag-psy-cbt`:
```bash
cd rag-psy-cbt
pip install -r requirements.txt
# Set environment variables in .env
python scripts/ingest_pinecone.py
```

---

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
