import { SandplayState, MiniatureItem } from '../types';

export function evaluateSandplay(state: SandplayState): string {
  if (!state.miniatures || state.miniatures.length === 0) {
    return '用户打开了心灵沙盘，但目前画布上没有任何沙具。地形背景是：' + state.terrain + '。';
  }

  const lines: string[] = [];
  lines.push(`沙盘基本信息：地形背景为「${state.terrain}」，共有 ${state.miniatures.length} 个沙具。`);

  // Calculate distances between all pairs
  const distances: Record<string, Record<string, number>> = {};
  for (let i = 0; i < state.miniatures.length; i++) {
    const a = state.miniatures[i];
    distances[a.id] = {};
    for (let j = 0; j < state.miniatures.length; j++) {
      if (i === j) continue;
      const b = state.miniatures[j];
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      distances[a.id][b.id] = Math.sqrt(dx * dx + dy * dy);
    }
  }

  // Generate descriptions for each item
  state.miniatures.forEach(item => {
    let desc = `[${item.label}] (类别: ${item.category})`;

    // 中心性与边缘化
    const dxCenter = item.position.x - 0.5;
    const dyCenter = item.position.y - 0.5;
    const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
    
    if (distCenter < 0.15) {
      desc += ' 被放置在画布正中央。';
    } else if (item.position.x < 0.1 || item.position.x > 0.9 || item.position.y < 0.1 || item.position.y > 0.9) {
      desc += ' 被边缘化，放置在画布角落或边缘。';
    } else {
      desc += ' 放置在一般位置。';
    }

    // 孤立检测
    const otherDists = Object.values(distances[item.id] || {});
    if (otherDists.length > 0) {
      const minD = Math.min(...otherDists);
      if (minD > 0.4) {
        desc += ' 它处于孤立状态，周围没有其他沙具。';
      }
    }

    // 与其他物体的关系
    const closeItems: string[] = [];
    const farItems: string[] = [];
    for (const [otherId, d] of Object.entries(distances[item.id] || {})) {
      const otherItem = state.miniatures.find(m => m.id === otherId);
      if (!otherItem) continue;
      if (d < 0.15) {
        closeItems.push(otherItem.label);
      } else if (d > 0.5) {
        farItems.push(otherItem.label);
      }
    }

    if (closeItems.length > 0) {
      desc += ` 它与 [${closeItems.join(', ')}] 紧密相邻。`;
    }
    if (farItems.length > 0) {
      desc += ` 它刻意远离了 [${farItems.join(', ')}]。`;
    }

    // 针对 self 类的特殊包围检测
    if (item.category === 'self') {
      let obstacleCount = 0;
      for (const [otherId, d] of Object.entries(distances[item.id] || {})) {
        const otherItem = state.miniatures.find(m => m.id === otherId);
        if (otherItem && otherItem.category === 'obstacle' && d < 0.25) {
          obstacleCount++;
        }
      }
      if (obstacleCount >= 2) {
        desc += ' ⚠️ 注意：该自我代表物似乎被多个压力/障碍物包围或围困。';
      }
    }

    lines.push(desc);
  });

  return lines.join('\n');
}
