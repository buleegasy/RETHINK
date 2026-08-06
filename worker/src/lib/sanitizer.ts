export const PROHIBITED_WORDS = [
  '卧槽',
  '靠北',
  '操蛋',
  '垃圾',
  '肏',
  '特么',
  '他妈',
  '妈的',
  '傻逼',
  '蠢货',
  '死鬼',
  '装逼',
];

/**
 * 检查文本是否包含任何专业调性所禁用的违禁词汇
 */
export function containsProhibitedWords(text: string): boolean {
  if (!text) return false;
  return PROHIBITED_WORDS.some(word => text.includes(word));
}

/**
 * 过滤 response 中可能出现的违禁词，将其替换为柔和称呼/叹词或掩码
 */
export function sanitizeResponse(text: string): string {
  if (!text) return text;
  let sanitized = text;
  for (const word of PROHIBITED_WORDS) {
    if (sanitized.includes(word)) {
      const replacement = word === '卧槽' || word === '靠北' || word === '靠' ? '天哪' : '***';
      sanitized = sanitized.split(word).join(replacement);
    }
  }
  return sanitized;
}

/**
 * 针对 SSE 流式传输，处理可能被切分在 chunk 边界上的违禁词前缀。
 * 若 text 结尾包含某些违禁词的前缀（如 "卧" 是 "卧槽" 的前缀），
 * 则将该前缀保留在 buffer 中暂不发送，其余部分为 emittable。
 */
export function getEmittableAndBuffer(text: string, isEnd: boolean = false): { emittable: string; buffer: string } {
  if (isEnd || !text) return { emittable: text || '', buffer: '' };

  for (let len = Math.min(text.length, 10); len > 0; len--) {
    const trailingStr = text.slice(text.length - len);
    const isPrefix = PROHIBITED_WORDS.some(pw => pw.startsWith(trailingStr) && pw !== trailingStr);
    if (isPrefix) {
      return {
        emittable: text.slice(0, text.length - len),
        buffer: trailingStr,
      };
    }
  }
  return { emittable: text, buffer: '' };
}

