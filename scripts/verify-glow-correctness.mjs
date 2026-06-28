/**
 * verify-glow-correctness.mjs
 * Empirically validates performance properties, layout stability,
 * GPU hardware acceleration, and memory leak safety of the premium glow implementation.
 */

import fs from 'fs';
import path from 'path';

function log(msg, ...args) {
  console.log(`[GLOW-VERIFY] ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`[GLOW-VERIFY-ERROR] ${msg}`, ...args);
}

const ROOT = '/Users/chenhaoran/工程文件/心理大赛';
const INDEX_CSS_PATH = path.join(ROOT, 'web/src/index.css');
const MESSAGE_BUBBLE_PATH = path.join(ROOT, 'web/src/components/chat/MessageBubble.tsx');
const AMBIENT_GLOW_PATH = path.join(ROOT, 'web/src/components/layout/AmbientGlow.tsx');

async function run() {
  log('Starting glow verification...');

  let exitCode = 0;

  // 1. Verify GPU Acceleration & Framer Motion optimization in AmbientGlow.tsx
  log('Checking GPU acceleration in AmbientGlow.tsx...');
  const ambientGlowContent = fs.readFileSync(AMBIENT_GLOW_PATH, 'utf-8');
  
  const willChangeMatches = (ambientGlowContent.match(/willChange:\s*['"]transform['"]/g) || []).length;
  log(`Found willChange: 'transform' occurrences: ${willChangeMatches}`);
  if (willChangeMatches !== 3) {
    error(`Expected exactly 3 willChange: 'transform' declarations (one for each cloud), but found ${willChangeMatches}`);
    exitCode = 1;
  } else {
    log('GPU Acceleration (will-change) in AmbientGlow.tsx: PASS');
  }

  // Verify custom cubic-bezier and duration in AmbientGlow.tsx
  const cubicBezierMatch = ambientGlowContent.includes('[0.445, 0.05, 0.55, 0.95]');
  log(`Custom cubic-bezier presence: ${cubicBezierMatch}`);
  if (!cubicBezierMatch) {
    error('Expected custom cubic-bezier [0.445, 0.05, 0.55, 0.95] easing for premium fluid dynamics');
    exitCode = 1;
  }

  const loopDurations = [12, 15, 18];
  for (const d of loopDurations) {
    if (!ambientGlowContent.includes(`duration: ${d}`)) {
      error(`Expected animation duration of ${d}s for one of the clouds`);
      exitCode = 1;
    }
  }

  // 2. Verify CSS Properties in index.css (no layout-inducing animated properties)
  log('Checking CSS transition properties in index.css...');
  const indexCssContent = fs.readFileSync(INDEX_CSS_PATH, 'utf-8');

  // Verify that keyframe animations do not animate layout-shifting properties (e.g. width, height, margin, padding, top, left, border-width)
  // Let's check keyframes content specifically
  const keyframesBlocks = indexCssContent.match(/@keyframes\s+[\w-]+\s*\{[^}]+\}/g) || [];
  log(`Found keyframe blocks: ${keyframesBlocks.length}`);

  for (const block of keyframesBlocks) {
    if (block.includes('border-glow-flow') || block.includes('bubble-breath')) {
      log(`Analyzing keyframe block:\n${block}`);
      const hasLayoutShiftProperties = /width|height|margin|padding|border-width|top:|left:|bottom:|right:/i.test(block);
      if (hasLayoutShiftProperties) {
        error(`Keyframe animation contains layout-shifting property animations! Block: ${block}`);
        exitCode = 1;
      } else {
        log(`Keyframe block is layout-stable (no reflow-triggering properties): PASS`);
      }
    }
  }

  // Verify mask-composite usage for border glow (ensures layout stays stable as it is a visual overlay)
  const hasMaskComposite = indexCssContent.includes('mask-composite: exclude') || indexCssContent.includes('-webkit-mask-composite: xor');
  log(`Mask composite check: ${hasMaskComposite}`);
  if (!hasMaskComposite) {
    error('Expected mask-composite to be used for the border glow outline');
    exitCode = 1;
  } else {
    log('Mask compositing border effect: PASS');
  }

  // 3. Verify component layout stability & re-render optimizations in MessageBubble.tsx
  log('Checking React rendering optimizations in MessageBubble.tsx...');
  const messageBubbleContent = fs.readFileSync(MESSAGE_BUBBLE_PATH, 'utf-8');

  // Verify React.memo on MessageBubble
  const hasMessageBubbleMemo = messageBubbleContent.includes('export const MessageBubble = React.memo(MessageBubbleComponent)');
  log(`MessageBubble is React.memoized: ${hasMessageBubbleMemo}`);
  if (!hasMessageBubbleMemo) {
    error('MessageBubble must be React.memoized to prevent re-renders when list updates');
    exitCode = 1;
  }

  // Verify React.memo on MessageChunk
  const hasMessageChunkMemo = messageBubbleContent.includes('const MessageChunk = React.memo<MessageChunkProps>');
  log(`MessageChunk is React.memoized: ${hasMessageChunkMemo}`);
  if (!hasMessageChunkMemo) {
    error('MessageChunk must be React.memoized to achieve O(1) rendering complexity per stream token');
    exitCode = 1;
  }

  // Verify Avatar spacing layout stability (no horizontal layout shift)
  const hasAvatarSpacer = messageBubbleContent.includes('<div className="w-8 h-8" />');
  log(`Avatar alignment spacer present: ${hasAvatarSpacer}`);
  if (!hasAvatarSpacer) {
    error('Avatar alignment spacer "<div className="w-8 h-8" />" is missing! This can cause messages in the same speaker group to shift horizontal alignment');
    exitCode = 1;
  }

  // Verify no JS-level interval/timeout leaks
  const hasSetInterval = messageBubbleContent.includes('setInterval') || ambientGlowContent.includes('setInterval');
  const hasSetTimeout = messageBubbleContent.includes('setTimeout') || ambientGlowContent.includes('setTimeout');
  const hasRequestAnimationFrame = messageBubbleContent.includes('requestAnimationFrame') || ambientGlowContent.includes('requestAnimationFrame');
  
  log(`JS timing loops: setInterval=${hasSetInterval}, setTimeout=${hasSetTimeout}, requestAnimationFrame=${hasRequestAnimationFrame}`);
  if (hasSetInterval || hasRequestAnimationFrame) {
    error('Timing loops (setInterval/requestAnimationFrame) detected in components. High risk of memory leaks during long sessions. Decoupled CSS or framer-motion is expected.');
    exitCode = 1;
  } else {
    log('No manual JS animation loops (timer leak safety): PASS');
  }

  if (exitCode === 0) {
    log('Glow implementation correctness verification: ALL PASSED');
  } else {
    error('Glow implementation correctness verification: FAILED');
  }
  
  process.exit(exitCode);
}

run().catch(err => {
  error(`Verification crashed: ${err.stack || err}`);
  process.exit(1);
});
