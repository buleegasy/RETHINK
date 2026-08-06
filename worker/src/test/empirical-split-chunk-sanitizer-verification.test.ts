import { describe, it, expect } from 'vitest';
import { sanitizeResponse, getEmittableAndBuffer } from '../lib/sanitizer';

/**
 * Re-implementation of exact streaming delta extraction & sanitization from worker/src/routes/chat.ts
 */
function simulateSSEStreamDeltas(chunks: string[]): { emittedDeltas: string[]; clientReconstructedText: string } {
  const UNESCAPED_QUOTE_REGEX = /(?<!\\)(?:\\\\)*"/;
  const getUnescapedQuoteIndex = (str: string): number => {
    const match = UNESCAPED_QUOTE_REGEX.exec(str);
    return match ? match.index + match[0].length - 1 : -1;
  };

  let fullResponse = '';
  let extractedReply = '';
  let sentUnescapedLength = 0;
  let isExtracting = false;
  let hasFinishedExtraction = false;
  let streamBuffer = '';

  const emittedDeltas: string[] = [];

  for (const chunk of chunks) {
    fullResponse += chunk;

    if (hasFinishedExtraction) continue;

    if (!isExtracting) {
      const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
      if (match && match.index !== undefined) {
        isExtracting = true;
      }
    }

    if (isExtracting) {
      const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
      if (match && match.index !== undefined) {
        const startContent = fullResponse.substring(match.index + match[0].length);
        const endIdx = getUnescapedQuoteIndex(startContent);

        if (endIdx !== -1) {
          extractedReply = startContent.substring(0, endIdx);
          hasFinishedExtraction = true;
        } else {
          extractedReply = startContent;
        }

        if (extractedReply && !extractedReply.endsWith('\\')) {
          const unescapedFull = extractedReply.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          const trueDelta = unescapedFull.substring(sentUnescapedLength);

          if (trueDelta) {
            sentUnescapedLength = unescapedFull.length;
            const combined = streamBuffer + trueDelta;
            const sanitizedCombined = sanitizeResponse(combined);
            const { emittable, buffer: newBuffer } = getEmittableAndBuffer(sanitizedCombined, false);
            streamBuffer = newBuffer;

            if (emittable.length > 0) {
              emittedDeltas.push(emittable);
            }
          }
        }
      }
    }
  }

  // Stream end flush
  if (streamBuffer.length > 0) {
    const finalChunk = sanitizeResponse(streamBuffer);
    if (finalChunk.length > 0) {
      emittedDeltas.push(finalChunk);
    }
    streamBuffer = '';
  }

  const clientReconstructedText = emittedDeltas.join('');
  return { emittedDeltas, clientReconstructedText };
}

describe('Empirical Verification — Split-Chunk Boundary SSE Streaming Delta Sanitization', () => {
  it('Tests split-chunk "卧槽" boundary (Chunk 1 "今天天气挺好，但是卧", Chunk 2 "槽也太倒霉了")', () => {
    const chunks = [
      '{"agent_reply":"今天天气挺好，但是卧',
      '槽也太倒霉了"}',
    ];

    const { emittedDeltas, clientReconstructedText } = simulateSSEStreamDeltas(chunks);

    console.log('--- Test 1 Results ---');
    console.log('Emitted Deltas:', JSON.stringify(emittedDeltas));
    console.log('Client Reconstructed Text:', JSON.stringify(clientReconstructedText));

    const expectedText = '今天天气挺好，但是天哪也太倒霉了';
    expect(clientReconstructedText).toBe(expectedText);
  });

  it('Tests split-chunk "靠北" boundary (Chunk 1 "今天也太靠", Chunk 2 "北了吧")', () => {
    const chunks = [
      '{"agent_reply":"今天也太靠',
      '北了吧"}',
    ];

    const { emittedDeltas, clientReconstructedText } = simulateSSEStreamDeltas(chunks);

    console.log('--- Test 2 Results ---');
    console.log('Emitted Deltas:', JSON.stringify(emittedDeltas));
    console.log('Client Reconstructed Text:', JSON.stringify(clientReconstructedText));

    const expectedText = '今天也太天哪了吧';
    expect(clientReconstructedText).toBe(expectedText);
  });

  it('Tests split-chunk "他妈" boundary (Chunk 1 "真是他", Chunk 2 "妈烦死了")', () => {
    const chunks = [
      '{"agent_reply":"真是他',
      '妈烦死了"}',
    ];

    const { emittedDeltas, clientReconstructedText } = simulateSSEStreamDeltas(chunks);

    console.log('--- Test 3 Results ---');
    console.log('Emitted Deltas:', JSON.stringify(emittedDeltas));
    console.log('Client Reconstructed Text:', JSON.stringify(clientReconstructedText));

    const expectedText = '真是***烦死了';
    expect(clientReconstructedText).toBe(expectedText);
  });
});
