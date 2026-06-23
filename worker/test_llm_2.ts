import { buildSystemPromptFSM } from './src/lib/llm';
import { FSMState } from './src/types';

async function chat(userMessage: string, state: FSMState, messages: any[]) {
  const prompt = buildSystemPromptFSM(state, "emotional");
  
  if (messages.length === 0) {
    messages.push({ role: "system", content: prompt });
  }
  
  messages.push({ role: "user", content: userMessage });
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      response_format: { type: "json_object" },
      messages: messages
    })
  });
  
  const data = await response.json();
  const rawReply = data.choices[0].message.content;
  messages.push({ role: "assistant", content: rawReply });
  try {
    const json = JSON.parse(rawReply);
    console.log(`\n\nAI (${state}): ${json.agent_reply}\n\n`);
    return json;
  } catch(e) {
    console.log("Failed to parse JSON", rawReply);
  }
}

async function runDemo2() {
  console.log("--- DEMO 2 START ---");
  const messages = [];
  let state: FSMState = "Icebreaking";
  
  let result = await chat("我和我最好的朋友好像越来越远了", state, messages);
  state = "ActiveListening"; // force state
  
  result = await chat("没吵过架 就是她现在天天和另一个女生一起 吃饭一起走 下课也凑一块 以前这些都是我和她", state, messages);
  state = "CognitiveRestructuring"; 
  
  result = await chat("我不知道 但我能感觉到她没有以前那么需要我了", state, messages);
  
  result = await chat("可能是我想多了 但就是控制不住", state, messages);
}

runDemo2();
