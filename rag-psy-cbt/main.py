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
    """
    Simulate a single turn of the psychological support agent.
    """
    print(f"\n[用户输入]: {user_input}")
    
    # 1. Intent Routing
    print("正在进行意图识别与路由...")
    intent_info = classify_intent(user_input)
    intent = intent_info.get("intent")
    print(f"意图分类: {intent} (理由: {intent_info.get('reason')})")
    
    # 2. Retrieval (if needed)
    context_chunks = []
    if intent in ["venting", "crisis"]:
        print(f"正在从知识库检索相关资料 (Namespace: {'cbt' if intent == 'venting' else 'safety'})...")
        namespace = "cbt" if intent == "venting" else "safety"
        search_res = query_knowledge(user_input, namespace=namespace, top_k=2)
        
        if search_res and search_res.matches:
            context_chunks = [m.metadata.get("content") for m in search_res.matches]
            print(f"检索到 {len(context_chunks)} 条相关知识点。")
    
    # 3. Build Prompt
    system_prompt = build_system_prompt(intent_info, context_chunks)
    user_msg = build_user_message(user_input)
    
    print("\n" + "="*20 + " 生成的 System Prompt " + "="*20)
    print(system_prompt)
    print("="*55 + "\n")
    
    # 4. Final LLM Call Placeholder
    print("提示：此时应调用 Llama 3.3 API 并传入上述 Prompt。")

if __name__ == "__main__":
    # Test with a venting case
    test_query = "我最近数学考试总是考不好，觉得自己很笨，努力也没用。"
    run_agent_turn(test_query)
