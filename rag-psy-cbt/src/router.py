import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-V3")

def classify_intent(user_input):
    """
    Classify the user input into: small_talk, venting, or crisis.
    """
    if not SILICONFLOW_API_KEY:
        raise ValueError("SILICONFLOW_API_KEY not found.")
        
    prompt = f"""
你是一个专业的青少年心理支持助手。请根据用户的输入判断其意图类型，并严格按照 JSON 格式返回。

意图类型定义：
1. small_talk (日常闲聊): 用户在进行简单的打招呼、日常闲谈、无明显情绪波动的沟通。
2. venting (情绪倾诉): 用户表达了明显的困惑、负面情绪、具体的压力事件或需要 CBT 分析。
3. crisis (危机信号): 用户表达了自残、自杀倾向、遭受暴力或极度绝望的信号。

用户输入: "{user_input}"

返回格式示例:
{{
  "intent": "venting",
  "reason": "用户表达了对考试的焦虑",
  "safety_level": "normal"
}}
"""
    
    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {SILICONFLOW_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as e:
        print(f"Routing failed: {e}")
        # Default to venting for safety
        return {"intent": "venting", "reason": "Classification failed", "safety_level": "normal"}

if __name__ == "__main__":
    test_inputs = [
        "你好啊",
        "我最近压力好大，感觉老师总是针对我",
        "我觉得活着没意思，想跳楼"
    ]
    for inp in test_inputs:
        print(f"Input: {inp}")
        print(f"Route: {classify_intent(inp)}")
        print("-" * 20)
