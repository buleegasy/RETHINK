/**
 * 文档分块器 — 用于 RAG 知识库文档的语义分块
 * 
 * 将 Markdown 知识文档按语义段落拆分为适合 embedding 的 chunks。
 * 每个 chunk 保留其标题上下文作为前缀，以提升向量检索准确度。
 */

export interface DocumentChunk {
  id: string;           // 唯一标识: documentId_chunkIndex
  content: string;      // chunk 文本内容（含标题前缀）
  documentId: string;   // 所属文档 ID
  documentTitle: string; // 所属文档标题
  headingPath: string;  // 标题路径，如 "模块二 > 非黑即白"
  chunkIndex: number;   // 在文档中的序号
}

export interface ChunkOptions {
  maxChunkSize?: number;    // 每个 chunk 最大字符数，默认 500
  minChunkSize?: number;    // 每个 chunk 最小字符数，默认 50
  overlapSize?: number;     // 相邻 chunk 重叠字符数，默认 50
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 500,
  minChunkSize: 50,
  overlapSize: 50,
};

/**
 * 将 Markdown 文档拆分为 chunks
 */
export function chunkDocument(
  content: string,
  documentId: string,
  documentTitle: string,
  options?: ChunkOptions
): DocumentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // Step 1: 按标题层级拆分为段落
  const sections = splitByHeadings(content);

  for (const section of sections) {
    const { headingPath, body } = section;
    const trimmedBody = body.trim();

    if (!trimmedBody || trimmedBody.length < opts.minChunkSize) {
      // 太短的段落，跳过或合并到下一段
      continue;
    }

    if (trimmedBody.length <= opts.maxChunkSize) {
      // 段落长度在限制内，作为单个 chunk
      chunks.push({
        id: `${documentId}_${chunkIndex}`,
        content: headingPath ? `[${headingPath}]\n${trimmedBody}` : trimmedBody,
        documentId,
        documentTitle,
        headingPath,
        chunkIndex,
      });
      chunkIndex++;
    } else {
      // 段落过长，按句子边界进一步拆分
      const subChunks = splitBySentences(trimmedBody, opts.maxChunkSize, opts.overlapSize);
      for (const sub of subChunks) {
        if (sub.trim().length >= opts.minChunkSize) {
          chunks.push({
            id: `${documentId}_${chunkIndex}`,
            content: headingPath ? `[${headingPath}]\n${sub.trim()}` : sub.trim(),
            documentId,
            documentTitle,
            headingPath,
            chunkIndex,
          });
          chunkIndex++;
        }
      }
    }
  }

  return chunks;
}

// ============================================================
// 内部辅助函数
// ============================================================

interface Section {
  headingPath: string;
  body: string;
}

/**
 * 按 Markdown 标题 (##, ###) 拆分文档为段落
 * 保留标题层级路径
 */
function splitByHeadings(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];

  let currentH1 = '';
  let currentH2 = '';
  let currentH3 = '';
  let currentBody: string[] = [];

  const flushSection = () => {
    const body = currentBody.join('\n').trim();
    if (body) {
      const pathParts = [currentH1, currentH2, currentH3].filter(Boolean);
      sections.push({
        headingPath: pathParts.join(' > '),
        body,
      });
    }
    currentBody = [];
  };

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h1Match) {
      flushSection();
      currentH1 = h1Match[1].trim();
      currentH2 = '';
      currentH3 = '';
    } else if (h2Match) {
      flushSection();
      currentH2 = h2Match[1].trim();
      currentH3 = '';
    } else if (h3Match) {
      flushSection();
      currentH3 = h3Match[1].trim();
    } else {
      currentBody.push(line);
    }
  }

  // 最后一段
  flushSection();

  return sections;
}

/**
 * 按中文句号、问号、感叹号等边界拆分文本
 * 支持重叠
 */
function splitBySentences(
  text: string,
  maxSize: number,
  overlapSize: number
): string[] {
  // 按中文标点和换行拆分为句子
  const sentenceDelimiters = /([。！？\n])/;
  const parts = text.split(sentenceDelimiters);

  // 重新组合句子（保留分隔符）
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] + (parts[i + 1] || '');
    if (sentence.trim()) {
      sentences.push(sentence);
    }
  }

  // 贪心合并句子为 chunks
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // 重叠：保留前一个 chunk 的尾部
      if (overlapSize > 0) {
        currentChunk = currentChunk.slice(-overlapSize) + sentence;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}
