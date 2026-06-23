import { buildSystemPromptFSM } from './src/lib/llm';
import { FSMState } from './src/types';

const messages = [];

async function chat(userMessage: string, state: FSMState) {
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
  console.log("Raw Response:");
  console.log(rawReply);
  messages.push({ role: "assistant", content: rawReply });
  try {
    const json = JSON.parse(rawReply);
    console.log(`\n\nAI (${state}): ${json.agent_reply}\n\n`);
    return json;
  } catch(e) {
    console.log("Failed to parse JSON");
  }
}

async function runDemo() {
  console.log("--- DEMO START ---");
  let state: FSMState = "Icebreaking";
  
  let result = await chat("也不知道怎么说 就是什么都不想做", state);
  if (result && result.icebreaker_update && result.icebreaker_update.exit_icebreaker) {
      state = "ActiveListening";
  }
  
  result = await chat("挺久了 可能一两个月吧 也不是天天这样 就是时不时突然觉得特别没意思", state);
  if (state === "Icebreaking" && result && result.icebreaker_update && result.icebreaker_update.exit_icebreaker) {
      state = "ActiveListening";
  }
  
  result = await chat("昨天吧 考完试回家我妈问我考得怎么样 我说还行 她说还行是多少分 我就突然不想说话了 也不是生气 就是累", state);
  if (state === "ActiveListening") state = "CognitiveRestructuring";
  
  result = await chat("对 其实挺多事的 成绩一直在往下掉 也不是大幅度那种 就是慢慢的 然后之前关系最好的朋友分班之后基本不联系了 班上也没什么能说心里话的人 回家也不想说 反正说了他们也不懂 就感觉哪哪都不对但又说不出来具体哪不对", state);
  
}

runDemo();
