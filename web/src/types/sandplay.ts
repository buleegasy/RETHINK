export type MiniatureCategory = 'self' | 'emotion' | 'obstacle' | 'resource';

export type TerrainTheme = 'desert' | 'starry_sky' | 'stormy_sea' | 'forest';

export interface MiniatureItem {
  id: string;
  assetKey: string;
  category: MiniatureCategory;
  label: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface SandplayState {
  terrain: TerrainTheme;
  miniatures: MiniatureItem[];
  createdAt: string;
}

export interface MiniatureAsset {
  key: string;
  name: string;
  category: MiniatureCategory;
  svgPath: string;
  defaultLabel: string;
  metaphor: string;
}

export const MINIATURE_ASSETS: MiniatureAsset[] = [
  // Self / Person
  { key: 'person_child', name: '小人', category: 'self', svgPath: '/sandplay/self/person_child.svg', defaultLabel: '我', metaphor: '自我投射、无力感或力量感' },
  { key: 'shadow', name: '影子', category: 'self', svgPath: '/sandplay/self/shadow.svg', defaultLabel: '阴影', metaphor: '未被接纳的自我、隐蔽的情绪' },
  { key: 'guardian', name: '守护者', category: 'self', svgPath: '/sandplay/self/guardian.svg', defaultLabel: '保护者', metaphor: '内在的支持力量、安全感来源' },
  { key: 'giant', name: '巨人', category: 'self', svgPath: '/sandplay/self/giant.svg', defaultLabel: '权威/压力源', metaphor: '外界的庞大压力、不可抗拒的力量' },
  
  // Emotion / Nature
  { key: 'dark_cloud', name: '乌云', category: 'emotion', svgPath: '/sandplay/emotion/dark_cloud.svg', defaultLabel: '压抑', metaphor: '挥之不去的负面情绪、担忧' },
  { key: 'sun', name: '太阳', category: 'emotion', svgPath: '/sandplay/emotion/sun.svg', defaultLabel: '温暖', metaphor: '意识的光明面、希望、支持' },
  { key: 'rainbow', name: '彩虹', category: 'emotion', svgPath: '/sandplay/emotion/rainbow.svg', defaultLabel: '希望', metaphor: '风雨后的转机、过渡期' },
  { key: 'fire', name: '火焰', category: 'emotion', svgPath: '/sandplay/emotion/fire.svg', defaultLabel: '愤怒/热情', metaphor: '强烈的愤怒或生命力、转化' },

  // Obstacle / Pressure
  { key: 'wall_brick', name: '高墙', category: 'obstacle', svgPath: '/sandplay/obstacle/wall_brick.svg', defaultLabel: '阻碍', metaphor: '自我封闭、难以逾越的障碍' },
  { key: 'chain', name: '锁链', category: 'obstacle', svgPath: '/sandplay/obstacle/chain.svg', defaultLabel: '束缚', metaphor: '无法摆脱的限制、拖拽感' },
  { key: 'abyss', name: '深渊', category: 'obstacle', svgPath: '/sandplay/obstacle/abyss.svg', defaultLabel: '绝望', metaphor: '深深的恐惧、无底的情绪漩涡' },
  { key: 'giant_wave', name: '巨浪', category: 'obstacle', svgPath: '/sandplay/obstacle/giant_wave.svg', defaultLabel: '情绪淹没', metaphor: '突如其来的失控感、压倒性的危机' },

  // Resource / Hope
  { key: 'key', name: '钥匙', category: 'resource', svgPath: '/sandplay/resource/key.svg', defaultLabel: '突破口', metaphor: '解决问题的关键、解锁心结' },
  { key: 'bridge', name: '桥梁', category: 'resource', svgPath: '/sandplay/resource/bridge.svg', defaultLabel: '连接', metaphor: '沟通的渠道、从当前状态到未来的过渡' },
  { key: 'cabin', name: '小屋', category: 'resource', svgPath: '/sandplay/resource/cabin.svg', defaultLabel: '避风港', metaphor: '内心的安全空间、休息与庇护' },
  { key: 'flower', name: '小花', category: 'resource', svgPath: '/sandplay/resource/flower.svg', defaultLabel: '生长', metaphor: '脆弱但顽强的生命力、新的希望' },
];
