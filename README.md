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

### 2. Multimodal Face Emotion Engine
The chat interface features real-time, privacy-preserving client-side facial expression recognition.
- **Native Camera Integration**: A face mesh overlay directly embedded in the chat input.
- **Micro-expression Amplifier**: A proprietary algorithm to overcome open-source neutral-bias, surfacing subtle emotions (e.g., slight frowns or fatigue).
- **EMA Smoothing & Period Accumulation**: Combats camera jitter and accumulates emotion over a time window, allowing the AI to respond to an aggregated emotional state rather than single-frame anomalies.

### 3. Intelligent Intent Routing & Crisis Intervention
All user inputs are classified by a lightweight intent classifier to tailor the conversational flow:
- **Casual (闲聊)**: General conversation and rapport building.
- **Emotional Venting (倾诉)**: Normal emotional stress that triggers RAG-augmented CBT support.
- **Crisis (危机)**: Immediate suspension of CBT protocols. Features an explicit Crisis Overlay with shortened, empathetic intervention text to prioritize safety and referrals.
- **Ambiguous (模糊)**: Conversational prompts requiring clarifying follow-ups.

### 4. Admin Dashboard & Authentication
- **Secure Login Wall**: Cloudflare Turnstile integrated authentication barrier ensuring authorized access.
- **Survey & Dashboard**: Includes high-precision traffic charts, auto-refresh capabilities, and proxy location forwarding for psychological survey and usage data.

### 5. Edge-Native Retrieval-Augmented Generation (RAG)
Contextualized prompt injection using vector search on top-tier psychological rulesets, adolescent mental health guidelines, and clinical prompt structures. All dynamically rendered via a Cloudflare Worker backend with fallback deduction strategies.

---

## 🏗️ System Architecture

```
User Browser (React + Face-API.js)
    │
    ▼
Cloudflare Pages (Static React Web App & Admin Dashboard)
    │  /api/* (Proxy Routing)
    ▼
Cloudflare Workers (Hono API Server on Edge)
    │
    ├─────────────┬─────────────┐
    ▼             ▼             ▼
Intent Router   Workers AI    OpenRouter API
(Classifier)  (BGE Embedding) (Gemini/Llama)
                  ▼
          Cloudflare Vectorize (Knowledge Base Index)
                  ▼
          Cloudflare D1 (Session, Auth, & Audit Logs)
```

---

## 📁 Repository Structure

```
re-think-agent/
├── web/                   # Vite + React + Tailwind CSS client
│   ├── src/               # React components, emotion engines, stores (Zustand), and hooks
│   └── wrangler.toml      # Config for Cloudflare Pages hosting
├── worker/                # Hono server running on Cloudflare Workers
│   ├── src/               # API routes, prompt engine, RAG client, Auth, and state check
│   └── wrangler.toml      # Config for D1, Vectorize, and worker bindings
├── rag-psy-cbt/           # Python ingest pipeline for Populating Pinecone/Vectorize
│   ├── data/              # Cleaned training/knowledge JSONL datasets
│   └── scripts/           # Ingestion scripts
├── LICENSE                # MIT License
├── plan.md                # Technical Architecture Roadmap
├── DEPLOYMENT.md          # Multi-environment Cloudflare deployment rules
└── tasks.md               # Tracking ongoing development progress
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
# Add your OPENROUTER_API_KEY / CLOUDFLARE_API_KEY
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
*Note: For production builds, please rely on Cloudflare CI/CD to prevent `face-api.js` local memory overflow.*

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
