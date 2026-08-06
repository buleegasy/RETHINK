import { describe, it, expect } from 'vitest';
import { getRandomReceptionistGreeting, RECEPTIONIST_GREETING_CANDIDATES } from '../lib/fsm';
import { sanitizeResponse, getEmittableAndBuffer } from '../lib/sanitizer';

describe('Empirical Verification — Challenger 2 (Milestone M4 Iteration 2)', () => {
  describe('Requirement 2: Greeting Candidate Sampling Verification', () => {
    it('getRandomReceptionistGreeting() should sample exclusively from RECEPTIONIST_GREETING_CANDIDATES', () => {
      const candidateSet = new Set(RECEPTIONIST_GREETING_CANDIDATES);
      expect(RECEPTIONIST_GREETING_CANDIDATES.length).toBe(5);

      for (let i = 0; i < 100; i++) {
        const greeting = getRandomReceptionistGreeting();
        expect(candidateSet.has(greeting)).toBe(true);
      }
    });

    it('getRandomReceptionistGreeting() should achieve 100% candidate coverage over 1,000 iterations', () => {
      const sampled = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        sampled.add(getRandomReceptionistGreeting());
      }

      expect(sampled.size).toBe(RECEPTIONIST_GREETING_CANDIDATES.length);
      for (const candidate of RECEPTIONIST_GREETING_CANDIDATES) {
        expect(sampled.has(candidate)).toBe(true);
      }
    });
  });

  describe('Requirement 3: SSE Streaming Delta Sanitization Empirical Stress Test', () => {
    /**
     * Helper to simulate the exact SSE streaming extraction & delta calculation logic in worker/src/routes/chat.ts (lines 462-496)
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

    it('sanitizes single-chunk prohibited words correctly', () => {
      const chunks = [
        '{"reasoning_deduction":{},"agent_reply":"卧槽，这也太糟心了！"}',
      ];
      const { clientReconstructedText } = simulateSSEStreamDeltas(chunks);
      expect(clientReconstructedText).not.toContain('卧槽');
      expect(clientReconstructedText).toContain('天哪');
    });

    it('empirically verifies streaming chunk boundary sanitization fix prevents prohibited word leaks', () => {
      // Chunk 1 ends with '卧', Chunk 2 starts with '槽'
      const chunks = [
        '{"reasoning_deduction":{},"agent_reply":"今天天气挺好，但是卧',
        '槽也太倒霉了，这真是傻逼"}',
      ];

      const { emittedDeltas, clientReconstructedText } = simulateSSEStreamDeltas(chunks);

      // Verify that '傻逼' (within single chunk 2) is sanitized to '***'
      expect(emittedDeltas[1]).toContain('***');

      // Empirically verify that '卧槽' (split across chunk 1 and chunk 2) DOES NOT LEAK to client UI
      const leakedProhibitedWord = clientReconstructedText.includes('卧槽');
      expect(leakedProhibitedWord).toBe(false);
      expect(clientReconstructedText).not.toContain('卧槽');
    });
  });
});
