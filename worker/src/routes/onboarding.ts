import { Hono } from 'hono';
import { getLLMClient, getModelName } from '../lib/llm';
import type { Env, UserProfile } from '../types';

export const onboardingRouter = new Hono<{ Bindings: Env }>();

const SYSTEM_PROMPT = `
你是一个心理状态分析引擎。
用户的输入是他们目前内心状态的“一句话自由表达”。
你需要分析这句话，并提取出 3 个维度的心理画像，严格按照 JSON 格式输出。

【输出格式】
{
  "weather": "Storm" | "Thunder" | "Fog" | "Sunny",
  "safetyIsland": "Arcade" | "DeepSea" | "MusicFestival",
  "stressor": "Academic" | "SelfEsteem" | "Relationship"
}

【维度说明】
1. weather (心理天气 - 情绪基线):
   - Storm: 极度不安、抑郁、崩溃、无力
   - Thunder: 愤怒、冲动、冲突、暴躁
   - Fog: 迷茫、困惑、找不到方向、麻木
   - Sunny: 相对平静、寻求提升、积极但有轻微烦恼

2. safetyIsland (安全岛 - 偏好的沟通/应对风格):
   - Arcade (赛博电玩城): 适合喜欢快节奏、需要隐喻和游戏化解构、逃避现实压力的用户
   - DeepSea (宁静深海): 适合极度疲惫、需要极高安全感、包容、安静倾听的用户
   - MusicFestival (阳光音乐节): 适合需要行为激活、需要能量注入、感到孤独需要陪伴的用户

3. stressor (核心压力源):
   - Academic: 提及考试、成绩、未来发展、学业压力
   - SelfEsteem: 提及自我怀疑、觉得自己差、别人看不起自己、自卑
   - Relationship: 提及人际冲突、孤独、父母、朋友、恋爱关系

注意：仅输出 JSON，不要任何其他文字或 Markdown 标记！
`;

onboardingRouter.post('/analyze', async (c) => {
  try {
    const { text } = await c.req.json<{ text: string }>();

    if (!text || !text.trim()) {
      return c.json({ error: 'Text is required' }, 400);
    }

    const client = getLLMClient(c.env);
    const model = getModelName(c.env);

    // 调用 Llama 3.3 进行特征提取
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.1, // 低温度以保证格式稳定
      response_format: { type: 'json_object' } // 要求 JSON 输出
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // 解析结果
    let profile: UserProfile;
    try {
      profile = JSON.parse(content) as UserProfile;
    } catch (e) {
      console.error('Failed to parse AI output as JSON:', content);
      // Fallback
      profile = {
        weather: 'Fog',
        safetyIsland: 'DeepSea',
        stressor: 'SelfEsteem'
      };
    }

    return c.json(profile);
  } catch (err: any) {
    console.error('Onboarding Analyze Error:', err);
    return c.json({ error: err.message }, 500);
  }
});
