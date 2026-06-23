import os
import sys
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from router import classify_intent
from retriever import query_knowledge
from prompt_builder import build_system_prompt, build_user_message

load_dotenv()

def run_agent_turn(user_input):
    print(f"\n[用户输入]: {user_input}")
    intent_info = classify_intent(user_input)
    intent = intent_info.get("intent")
    print(f"意图分类: {intent} (理由: {intent_info.get('reason')})")
    
    context_chunks = []
    if intent in ["venting", "crisis"]:
        namespace = "cbt" if intent == "venting" else "safety"
        search_res = query_knowledge(user_input, namespace=namespace, top_k=2)
        if search_res and search_res.matches:
            context_chunks = [m.metadata.get("content") for m in search_res.matches]
    
    system_prompt = build_system_prompt(intent_info, context_chunks)
    print("\n" + "="*20 + " SYSTEM STRATEGY " + "="*20)
    # Just print the strategy part to save space
    for line in system_prompt.split('\n'):
        if '【当前策略】' in line:
            print(line)
    if context_chunks:
        print(f"检索到的知识库条数: {len(context_chunks)}")
        print(f"第一条摘要: {context_chunks[0][:100]}...")

if __name__ == "__main__":
    test_cases = [
        "我最近心情有点低落，觉得什么都做不好。",
        "我觉得活着没意思，想结束这一切。"
    ]
    for case in test_cases:
        run_agent_turn(case)
