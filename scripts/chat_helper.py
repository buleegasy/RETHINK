import json
import sys
import requests
import os

STATE_FILE = "/Users/chenhaoran/工程文件/心理大赛/scripts/mind_eval_state.json"
API_URL = "https://re-think-agent-worker.buleegasy-6c8.workers.dev/api/chat"

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"messages": [], "sessionId": "mind_eval_session_002"}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def main():
    if len(sys.argv) < 2:
        print("Usage: python chat_helper.py <message> [reset]")
        return
    
    if len(sys.argv) == 3 and sys.argv[2] == "reset":
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
            print("State reset.")
        
    user_msg = sys.argv[1]
    state = load_state()
    
    state["messages"].append({"role": "user", "content": user_msg})
    
    payload = {
        "messages": state["messages"],
        "sessionId": state["sessionId"],
        "model": "gpt-4o",
        "stream": False
    }
    
    headers = {
        "Authorization": "Bearer mock-token-mindeveal123",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        response.raise_for_status()
        
        try:
            data = response.json()
            text_resp = data
            if isinstance(data, dict):
                if "content" in data:
                    text_resp = data["content"]
                elif "choices" in data:
                    text_resp = data["choices"][0]["message"]["content"]
                elif "response" in data:
                    text_resp = data["response"]
        except json.JSONDecodeError:
            text_resp = response.text
            
        print("AGENT:", text_resp)
        
        state["messages"].append({"role": "assistant", "content": text_resp if isinstance(text_resp, str) else json.dumps(text_resp, ensure_ascii=False)})
        save_state(state)
        
    except Exception as e:
        print("Error:", e)
        if 'response' in locals():
            print("Response text:", response.text)

if __name__ == "__main__":
    main()
