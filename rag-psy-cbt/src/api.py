"""
src/api.py  —  RAG 心理支持智能体 REST API
运行: uvicorn src.api:app --reload --port 8000
"""

import os, sys, requests as http_requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# 确保 src 可被导入
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from router import classify_intent
from retriever import query_knowledge
from prompt_builder import build_system_prompt

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-V3")

app = FastAPI(title="心理支持 RAG 智能体", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    intent: str
    safety_level: str
    retrieved_chunks: int


def call_llm(system_prompt: str, user_message: str) -> str:
    resp = http_requests.post(
        "https://api.siliconflow.cn/v1/chat/completions",
        json={
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "temperature": 0.7,
            "max_tokens": 800,
        },
        headers={
            "Authorization": f"Bearer {SILICONFLOW_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    user_input = req.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 1. 意图路由
    intent_info = classify_intent(user_input)
    intent      = intent_info.get("intent", "venting")
    safety      = intent_info.get("safety_level", "normal")

    # 2. 向量检索
    context_chunks = []
    if intent in ("venting", "crisis"):
        ns = "safety" if intent == "crisis" else "cbt"
        res = query_knowledge(user_input, namespace=ns, top_k=3)
        if res and res.matches:
            context_chunks = [m.metadata.get("content", "") for m in res.matches]

    # 3. 构建 Prompt
    system_prompt = build_system_prompt(intent_info, context_chunks)

    # 4. 调用 LLM
    reply = call_llm(system_prompt, user_input)

    return ChatResponse(
        reply=reply,
        intent=intent,
        safety_level=safety,
        retrieved_chunks=len(context_chunks),
    )


@app.get("/health")
def health():
    return {"status": "ok", "model": LLM_MODEL}


# ── 内置轻量测试页面 ──────────────────────────────────────────────────
TEST_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RE-THINK Agent | 心理支持 CBT 智能体</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  :root {
    --glass-bg: rgba(255, 255, 255, 0.08);
    --glass-border: rgba(255, 255, 255, 0.15);
    --primary: #818cf8;
    --primary-hover: #6366f1;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-main);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: radial-gradient(circle at top left, #312e81, #0f172a 40%, #020617 100%);
    background-attachment: fixed;
    overflow: hidden;
  }
  .ambient-light {
    position: absolute; width: 60vw; height: 60vw;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%);
    top: -20vh; left: -10vw; border-radius: 50%; z-index: 0; pointer-events: none;
    animation: float 15s ease-in-out infinite alternate;
  }
  .ambient-light.right {
    top: auto; bottom: -20vh; left: auto; right: -10vw;
    background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 60%);
    animation-delay: -7s;
  }
  @keyframes float { 0% { transform: translate(0,0); } 100% { transform: translate(5vw, 5vh); } }

  .app-container {
    position: relative; z-index: 1; width: 100%; max-width: 800px; height: 100vh;
    display: flex; flex-direction: column; padding: 0;
  }
  header { padding: 30px 24px 20px; text-align: center; background: linear-gradient(to bottom, rgba(2,6,23,0.8) 0%, transparent 100%); }
  h1 { font-size: 1.6rem; font-weight: 600; background: linear-gradient(to right, #e0e7ff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 0.5px; margin-bottom: 8px;}
  p.sub { font-size: 0.85rem; color: var(--text-muted); font-weight: 300; letter-spacing: 0.5px;}

  #chat {
    flex: 1; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; gap: 24px; scroll-behavior: smooth; padding-bottom: 140px;
  }
  #chat::-webkit-scrollbar { width: 6px; }
  #chat::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

  .msg-wrapper { display: flex; flex-direction: column; opacity: 0; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .msg-wrapper.user { align-items: flex-end; }
  .msg-wrapper.bot { align-items: flex-start; }

  .bubble {
    padding: 14px 20px; border-radius: 20px; max-width: 85%; font-size: 0.95rem; line-height: 1.6;
    letter-spacing: 0.2px; white-space: pre-wrap; word-break: break-word; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  .user .bubble { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border-bottom-right-radius: 4px; }
  .bot .bubble { background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-border); color: var(--text-main); border-bottom-left-radius: 4px; }

  .meta { font-size: 0.75rem; margin-top: 8px; display: flex; gap: 8px; align-items: center; margin-left: 4px; }
  .tag { padding: 4px 10px; border-radius: 99px; font-weight: 500; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
  .tag-small_talk { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3); }
  .tag-venting { background: rgba(56, 189, 248, 0.15); color: #7dd3fc; border-color: rgba(56, 189, 248, 0.3); }
  .tag-crisis { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }
  .tag-retrieved { background: rgba(148, 163, 184, 0.1); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.2); }

  .input-container { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: calc(100% - 48px); max-width: 700px; z-index: 10; }
  form { display: flex; gap: 12px; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; padding: 8px 8px 8px 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05); transition: all 0.3s ease; }
  form:focus-within { border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 4px rgba(99, 102, 241, 0.1); }
  input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 0.95rem; font-family: inherit; }
  input::placeholder { color: #64748b; }
  button { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border: none; border-radius: 99px; padding: 12px 24px; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); }
  button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4); }
  button:disabled { opacity: 0.6; cursor: not-allowed; }

  .typing-indicator { display: flex; gap: 4px; padding: 6px 4px; }
  .dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: blink 1.4s infinite both; }
  .dot:nth-child(1) { animation-delay: 0s; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }
</style>
</head>
<body>
  <div class="ambient-light"></div>
  <div class="ambient-light right"></div>
  <div class="app-container">
    <header><h1>RE-THINK Agent</h1><p class="sub">基于 Llama 3.3 与 CBT 的情绪支持舱</p></header>
    <div id="chat"></div>
    <div class="input-container">
      <form id="form"><input id="inp" placeholder="此刻你感受如何？随时倾诉..." autocomplete="off"><button id="btn" type="submit">发送</button></form>
    </div>
  </div>
<script>
const chat = document.getElementById('chat'), inp = document.getElementById('inp'), btn = document.getElementById('btn');
const intentLabel = {'small_talk':'☕ 日常闲聊', 'venting':'🌿 情绪倾诉', 'crisis':'⚠ 危机支持'};

function addMsg(text, cls, meta) {
  const w = document.createElement('div'); w.className = 'msg-wrapper ' + cls;
  const b = document.createElement('div'); b.className = 'bubble'; 
  if(text === 'TYPING') {
    b.innerHTML = '<div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    b.id = 'typing';
  } else { b.textContent = text; }
  w.appendChild(b);
  if (meta) { const m = document.createElement('div'); m.className = 'meta'; m.innerHTML = meta; w.appendChild(m); }
  chat.appendChild(w); setTimeout(() => chat.scrollTop = chat.scrollHeight, 50); return w;
}

document.getElementById('form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = inp.value.trim(); if (!msg) return;
  addMsg(msg, 'user'); inp.value = ''; btn.disabled = true;
  const loadingNode = addMsg('TYPING', 'bot');
  try {
    const res = await fetch('/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: msg}) });
    const d = await res.json();
    chat.removeChild(loadingNode);
    const metaHtml = `<span class="tag tag-${d.intent}">${intentLabel[d.intent] || d.intent}</span><span class="tag tag-retrieved">📚 引用 ${d.retrieved_chunks} 条知识</span>`;
    addMsg(d.reply, 'bot', metaHtml);
  } catch (err) {
    chat.removeChild(loadingNode); addMsg('服务暂时无法访问，请检查后端运行状态。', 'bot');
  }
  btn.disabled = false; inp.focus();
});
setTimeout(() => { addMsg("你好。我是 RE-THINK 心理支持助理，这里是一个安全的倾诉空间。无论你遇到什么烦心事，或者只是想聊聊，我都在这里陪伴你。", "bot"); }, 400);
</script>
</body>
</html>"""

@app.get("/", response_class=HTMLResponse)
def index():
    return TEST_HTML
