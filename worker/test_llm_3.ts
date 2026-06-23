import { buildSystemPromptFSM } from './src/lib/llm';
import { FSMState } from './src/types';

async function chat(userMessage: string, state: FSMState, messages: any[], intent: string) {
  const prompt = buildSystemPromptFSM(state, intent as any);
  
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
  try {
    const json = JSON.parse(rawReply);
    console.log(`\n\nAI (${intent}): ${json.agent_reply}\n\n`);
  } catch(e) {
    console.log("Failed to parse JSON", rawReply);
  }
}

async function runDemo3() {
  console.log("--- DEMO 3 START ---");
  await chat("我真的撑不下去了 不想活了", "Icebreaking", [], "crisis");
  await chat("我并没有想自残 别担心", "Icebreaking", [], "emotional");
}

runDemo3();
