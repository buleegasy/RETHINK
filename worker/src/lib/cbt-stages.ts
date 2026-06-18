import type { CBTStage } from '../types';

/**
 * CBT 五阶段关键词检测映射表
 * 每个阶段对应一组触发关键词（中文）
 */
const STAGE_KEYWORDS: Record<CBTStage, string[]> = {
  '剥离事实': [
    '发生了什么', '描述一下', '具体说说', '事情经过', '陈述事实',
    '你说的是', '你提到', '这件事', '什么时候', '在哪里', '谁',
  ],
  '捕获想法': [
    '你认为', '你觉得', '你的想法', '你相信', '你以为',
    '在你看来', '你的判断', '你的解读', '你的结论', '你怎么理解',
    '想法是', '你内心', '自动想法',
  ],
  '扫描漏洞': [
    '这个逻辑', '你有没有考虑', '另一种可能', '假设', '前提是',
    '这是否意味着', '逻辑上', '推理', '你是如何得出', '漏洞',
    '不一致', '矛盾', '例外', '你确定吗', '真的吗',
  ],
  '证据质询': [
    '证据是什么', '事实支持', '你有什么根据', '数据', '具体例子',
    '证明', '反例', '客观上', '实际发生', '有没有记录',
    '支持这个结论的', '反驳这个结论的', '质询',
  ],
  '重构认知': [
    '换一种视角', '新的理解', '重新看', '如果换个角度', '另一种解释',
    '更平衡的看法', '更准确的表述', '修正后的想法', '认知重构',
    '新的结论', '重新定义', '调整后',
  ],
};

/**
 * 根据 AI 输出文本检测当前 CBT 阶段
 * 优先级：后期阶段 > 前期阶段（防止关键词误匹配）
 */
export function detectStage(text: string, currentStageIndex: number = 0): CBTStage {
  const stages: CBTStage[] = [
    '重构认知',
    '证据质询',
    '扫描漏洞',
    '捕获想法',
    '剥离事实',
  ];

  for (const stage of stages) {
    const keywords = STAGE_KEYWORDS[stage];
    if (keywords.some(kw => text.includes(kw))) {
      return stage;
    }
  }

  // 无明确关键词时，维持当前阶段
  const stageOrder: CBTStage[] = [
    '剥离事实', '捕获想法', '扫描漏洞', '证据质询', '重构认知',
  ];
  return stageOrder[Math.min(currentStageIndex, 4)];
}

/**
 * 将阶段名称转换为索引（0-4）
 */
export function stageToIndex(stage: CBTStage): number {
  const map: Record<CBTStage, number> = {
    '剥离事实': 0,
    '捕获想法': 1,
    '扫描漏洞': 2,
    '证据质询': 3,
    '重构认知': 4,
  };
  return map[stage];
}

/**
 * 将索引转换为阶段名称
 */
export function indexToStage(index: number): CBTStage {
  const stages: CBTStage[] = [
    '剥离事实', '捕获想法', '扫描漏洞', '证据质询', '重构认知',
  ];
  return stages[Math.min(Math.max(index, 0), 4)];
}
