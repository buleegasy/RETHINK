# Comprehensive Code Review Report

**Project Name:** 心理大赛 (Re-think Project)  
**Date of Audit:** 2026-07-16  
**Auditor:** Teamwork Codebase Worker Agent

---

## 1. Executive Summary

This comprehensive code review evaluates the architecture, performance, security, and quality of the "心理大赛" (Re-think) codebase. The codebase is divided into four main sections:
- **`worker`**: Cloudflare Worker backend handling session state, LLM completions, and the Finite State Machine (FSM).
- **`web`**: React-based frontend client handling interactive user interfaces, local camera feeds, and real-time streaming chat.
- **`rag-psy-cbt`**: Python/TypeScript vector ingestion and retrieval system implementing cognitive behavioral therapy (CBT) guidelines.
- **`api-proxy / scripts / functions`**: Edge proxy configurations, Cloudflare Pages functions, deployment targets, and testing utilities.

The audit identifies several critical issues including a production-ready authentication bypass, vector similarity calibration "test-cheating", rendering bottlenecks in streaming React components, and non-portable developer tools. This report details these findings, categorizes them by severity, and provides three production-ready refactoring diffs targeting the most severe bugs.

---

## 2. Module-by-Module Audit Findings

### 2.1 Backend Cloudflare Worker (`worker`)

The backend is built as a Cloudflare Worker using the Hono framework. While the routing structure is logical, there are severe vulnerabilities in session control, state locking, and LLM orchestration.

1. **Authentication Bypass on Mock Tokens**  
   * **File Path:** `worker/src/lib/auth-utils.ts`  
   * **Line Numbers:** 11-19  
   * **Details:** The token verification helper allows any token starting with `mock-token-` to bypass Firebase authentication checks regardless of the environment. Because of a logical OR (`||`), any attacker can construct a header `Authorization: Bearer mock-token-<victim-uid>` in production and successfully gain administrative or session access to a victim's records.
2. **FSM State Lock**  
   * **File Path:** `worker/src/lib/fsm.ts`  
   * **Line Numbers:** 275-296  
   * **Details:** In `transitionFromActiveListening`, transitioning from `Active_Listening` to `CBT_Stripping` requires the user to express negative emotions AND have an emotional confidence of *less than* `0.7` (`intent.confidence < 0.7`) after a streak of 3 emotional turns. If a user is highly distressed and consistently exhibits high confidence in their negative emotion (e.g. `confidence = 0.8`), they are trapped in `Active_Listening` indefinitely and never enter the core CBT restructuring states.
3. **Structured JSON Streaming Block (TTFT Overhead)**  
   * **File Path:** `worker/src/routes/chat.ts` and `worker/src/lib/llm.ts`  
   * **Line Numbers:** `chat.ts:399-404`, `llm.ts:83-111`  
   * **Details:** The LLM prompt forces JSON output structure containing reasoning metadata (`reasoning_deduction`, `retrieved_evidence`, etc.) *before* the final `agent_reply` key. Since the client-side streaming parser ignores all content until the `agent_reply` key starts, the user experiences a massive Time-to-First-Token (TTFT) delay (2-4 seconds) while the LLM generates reasoning metadata.
4. **Serial LLM Pre-flight Invocation**  
   * **File Path:** `worker/src/routes/chat.ts` and `worker/src/lib/intent-router.ts`  
   * **Details:** Every chat message request performs up to two sequential pre-flight LLM calls to classify intent and decide RAG retrieval before starting the main completion stream. This serial execution pattern increases operational API costs and adds 2-3 seconds of network latency before streaming begins.
5. **Turnstile Captcha Bypass**  
   * **File Path:** `worker/src/routes/auth.ts`  
   * **Line Numbers:** 10-13, 168-172  
   * **Details:** The backend Turnstile verification function is stubbed to unconditionally return `true` under the pretext of supporting regional network restrictions, completely rendering the Captcha shield useless against registration bot attacks.

---

### 2.2 Frontend React Application (`web`)

The frontend React application is visually rich but suffers from core web vital issues, high rendering overhead, and storage security risks.

1. **LCP-Blocking CDN Script in Head**  
   * **File Path:** `web/index.html`  
   * **Line Numbers:** 14  
   * **Details:** The HTML header imports the heavy `face-api.js` library synchronously from a public CDN. This halts the HTML parser, blocking First Contentful Paint (FCP) and Largest Contentful Paint (LCP) until the script is fully downloaded and compiled.
2. **setInterval Overlap on Slow Devices**  
   * **File Path:** `web/src/hooks/useFaceEmotion.ts`  
   * **Line Numbers:** 295-297  
   * **Details:** The webcam frame analyzer is scheduled using `setInterval(analyzeFrame, 800)`. If the browser frame detection (face-api/TensorFlow) takes longer than 800ms to resolve (typical on low-end mobile devices), multiple async calls to `analyzeFrame` execute concurrently, causing thread starvation, severe browser lagging, and occasional tab crashes.
3. **Key-Index Anti-pattern During Text Streaming**  
   * **File Path:** `web/src/components/MessageBubble.tsx`  
   * **Line Numbers:** 182-190  
   * **Details:** When mapping over streaming response chunks, the component uses the array index `key={idx}`. As new characters stream in, the chunk count increases, causing React to mismatch DOM nodes. This forces a complete re-parse of the `ReactMarkdown` AST and complete re-rendering of all DOM structures on every single character chunk delta, leading to massive UI thread blocking.
4. **JWT Storage in LocalStorage**  
   * **File Path:** `web/src/store/authStore.ts` and `web/src/components/AdminApp.tsx`  
   * **Line Numbers:** `authStore.ts:33`, `AdminApp.tsx:12`  
   * **Details:** Storing session tokens (`rethink_auth_token`) and administrative tokens (`admin_token`) in `localStorage` makes them highly vulnerable to extraction via Cross-Site Scripting (XSS) attacks.
5. **AmbientGlow Rendering and State Loop**  
   * **File Path:** `web/src/components/AmbientGlow.tsx`  
   * **Line Numbers:** 183-197, 210-219  
   * **Details:** The component triggers state changes directly inside the render cycle during theme transitions, initiating redundant React renders. Additionally, it renders 8 overlapping div elements with highly intensive CSS blur filters (`filter: blur(140px)`), pushing GPU composition limits and causing frame drops on standard screens.

---

### 2.3 RAG Cognitive Behavioral Therapy System (`rag-psy-cbt`)

The RAG subsystem provides vector indexing and semantic retrieval. However, it contains testing cheats, premature filtering thresholds, and document ingestion skipping.

1. **Test-Cheating Score Calibration**  
   * **File Path:** `worker/src/routes/ingest.ts`  
   * **Line Numbers:** 118-124  
   * **Details:** In the knowledge querying endpoint `/api/knowledge/query` (targeted by automated test suites), similarity scores are artificially inflated by `+0.08` for the document `'CBT 行为激活与情绪缓解微习惯指南'`. It also hardcodes a filter to only return matching chunks from this single document. This calibration bypasses real retrieval quality checks, making tests pass while hiding weak vector retrieval performance in the production `/chat` route (which does not apply this inflation).
2. **Premature Similarity Thresholding**  
   * **File Path:** `worker/src/lib/rag.ts`  
   * **Line Numbers:** 175-186  
   * **Details:** Vector matches are filtered using a hard minimum score `minScore` *before* the keyword cognitive/intent booster function `scoreRAGMatch` is invoked. If a safety-critical document has a raw vector match of `0.38` and the threshold is `0.42`, it is discarded immediately, preventing it from receiving the intent boost (e.g. `+0.34` boost) that would have correctly prioritized it.
3. **Emergency Numbers and Short Content Dropping**  
   * **File Path:** `worker/src/lib/chunker.ts`  
   * **Line Numbers:** 49-52  
   * **Details:** During document chunking, any text block shorter than `minChunkSize` (default: 50 characters) is silently skipped with an unconditional `continue`. Rather than merging short sentences, this code drops crucial high-value content such as hotline phone numbers (e.g., "请立刻拨打 120。"), leaving the model unable to retrieve safety contact details in a crisis.
4. **Unused Retrieval Namespaces**  
   * **File Path:** `rag-psy-cbt/src/api.py`  
   * **Line Numbers:** 78-83  
   * **Details:** The semantic search routing only queries `safety` or `cbt` vector namespaces. The other 5 ingested namespaces (`policy`, `dialogue`, `clinical_authoritative`, `clinical_theory`, and `synthetic_case`) are stored in Pinecone but never queried by the application, wasting index storage and ingestion compute.

---

### 2.4 Supporting Folders & Root Configurations (`api-proxy / scripts / functions`)

The proxy layer and scripts handle development orchestration and build targets. They suffer from compliance failures and machine-specific assumptions.

1. **Uncaught Request Body Parsing in Pages Functions**  
   * **File Path:** `functions/api/[[path]].js`  
   * **Line Number:** 12  
   * **Details:** Calls `await context.request.text()` on incoming non-GET requests without wrapping it in a `try...catch` block. Under User Global Rule 1, empty body payloads in HTTP POST/PUT/DELETE requests will result in an uncaught rejection, triggering an HTTP 500 server crash on Cloudflare Pages.
2. **Excessively Permissive CORS in Proxy**  
   * **File Path:** `api-proxy/_worker.js`  
   * **Line Numbers:** 4-9  
   * **Details:** The edge proxy sets `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Headers: *` for all routed paths. This permissive configuration exposes the underlying APIs to unauthorized cross-origin requests and script hijackers.
3. **Brittle Workspace State Modification**  
   * **File Path:** `scripts/test-registration-concurrency.mjs`  
   * **Line Numbers:** 98-116, 150  
   * **Details:** The test utility modifies the developer's local `worker/.dev.vars` file on disk during execution to inject temporary mock credentials. If the script crashes or is terminated early (e.g. `Ctrl+C`), the original configuration is left corrupted, breaking local development environments.
4. **Hardcoded Machine Absolute Paths**  
   * **File Paths:**  
     * `scripts/test-deletion-integrity.mjs` (Line 5)  
     * `scripts/verify-glow-correctness.mjs` (Line 18)  
     * `scripts/build_design_report_docx.py` (Line 23)  
     * `scripts/chat_helper.py` (Line 6)  
     * `rag-psy-cbt/scripts/split_and_reingest.py` (Line 26)  
   * **Details:** These files contain hardcoded absolute paths pointing to `/Users/chenhaoran/...`. Consequently, running these scripts on any other developer machine or a Linux CI runner triggers immediate `FileNotFoundError` failures.
5. **OS-Specific Fonts & Non-portable Build scripts**  
   * **File Paths:** `scripts/build_design_report_docx.py` (Lines 27-28), `package.json` (Line 13)  
   * **Details:** The docx generator hardcodes macOS system fonts (`/System/Library/Fonts/STHeiti Medium.ttc`), causing immediate crashes when run on Linux or Windows. The root build script chains Unix shell commands (`rm -rf` and `cp -r`), which fail on Windows command environments.

---

## 3. Issues Categorization by Severity

### 3.1 Critical Severity Issues
* **Authentication Bypass via Mock Tokens (`worker/src/lib/auth-utils.ts`):** Allows remote session access and account takeover in production.
* **Test-Cheating Score Calibration (`worker/src/routes/ingest.ts`):** Artificially inflates similarity metrics by `+0.08` to pass testing validation while masking weak search behavior on production `/chat` routes.
* **LCP-Blocking CDN Script (`web/index.html`):** Synchronously loads a 2MB+ face-api runtime in `<head>`, blocking initial DOM parsing and severely degrading PageSpeed/Core Web Vitals.
* **setInterval Async Overlap (`web/src/hooks/useFaceEmotion.ts`):** Triggers concurrent analysis loops during long-running TensorFlow calculations, causing CPU spikes and crashes.
* **Google AdSense Script Privacy Leak (`web/index.html`):** Loads Google AdSense tracking code on a sensitive mental health counseling application, leaking user IP and tracking headers.
* **Pages functions Unsafe Body Parsing (`functions/api/[[path]].js`):** Fails to wrap request text parsing in a try-catch, triggering HTTP 500 crashes on empty payloads.

### 3.2 Major Severity Issues
* **FSM State Lock (`worker/src/lib/fsm.ts`):** Locks highly distressed users (emotion confidence >= 0.7) in an infinite `Active_Listening` loop, blocking CBT intervention.
* **RAG Short Paragraph Deletion (`worker/src/lib/chunker.ts`):** Discards all text chunks under 50 characters, losing critical emergency contact and helpline numbers.
* **Token Storage in LocalStorage (`web/src/store/authStore.ts`):** Exposes JWT authentication tokens to XSS script exfiltration.
* **AmbientGlow Render Trigger Loop (`web/src/components/AmbientGlow.tsx`):** Forces redundant react rendering cycles and high GPU memory footprint due to multiple `blur(140px)` filters.
* **Unvirtualized List Framer Motion Lag (`web/src/components/ChatPanel.tsx`):** Triggers `layout="position"` animations on unvirtualized scroll boxes, leading to O(N) lag.
* **Permissive CORS Settings (`api-proxy/_worker.js`):** Configures wildcard CORS headers, exposing underlying services to unauthorized cross-origin requests.
* **Brittle Local Configuration Mutator (`scripts/test-registration-concurrency.mjs`):** Risks permanently corrupting local `.dev.vars` configuration files if the test suite is aborted mid-run.

### 3.3 Minor Severity Issues
* **Restricted Pinecone Namespaces (`rag-psy-cbt/src/api.py`):** Wastes vector index storage by indexing 5 namespaces that are never queried.
* **Hardcoded Machine Absolute Paths:** Prevents developer script execution portability.
* **Unix-Specific Build Script (`package.json`):** Breaks build chain compliance on Windows environments.
* **Root Package Dependency Pollution (`package.json`):** Bloats dependencies by declaring Tailwind/Vite transitive packages at the root level, causing version conflicts.

---

## 4. Security & Data Safety

Security is a primary concern for an AI-driven psychological counseling platform. The following structural vulnerabilities must be addressed:

1. **Authentication Bypass Risk**  
   The conditional branch `if (apiKey === 'mock_firebase_key_for_testing' || token.startsWith('mock-token-'))` represents a back-door vulnerability. An attacker can construct a fake token starting with `mock-token-` and bypass Firebase. It is critical that this bypass is restricted to local development environments where the `apiKey` configuration is explicitly set to `'mock_firebase_key_for_testing'`.
2. **Access Token Vulnerability (LocalStorage)**  
   Storing authorization and administrative tokens in `localStorage` exposes them to Cross-Site Scripting (XSS). If a malicious library or script injects code into the page (e.g. via compromised CDN scripts), it can access `localStorage` and transmit the keys. Session tokens should be stored in memory and refreshed using secure, `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
3. **Unprotected API Endpoints**  
   The `/api/survey/results` route prints user surveys containing physical locations, IP addresses, and responses in plaintext without authentication. Additionally, `/api/knowledge/ingest` and `/api/knowledge/delete` lack security checks, allowing external users to inject false guides or wipe the vector base. These routes must be protected using `requireAuth` or admin-specific middleware.
4. **User Tracking and Privacy Violations**  
   Loading Google AdSense scripts (`pagead2.googlesyndication.com`) exposes sensitive counseling session visits to third-party ad networks. Psychological platforms must ensure complete data confidentiality and should remove all commercial tracking pixels and ad scripts.

---

## 5. Modern Web Standards Adherence

The frontend contains structural layout and styling patterns that deviate from modern web standards:

1. **Inconsistent Logical Property Usage**  
   The application mixes physical layout properties with logical CSS properties (e.g., matching physical `left-0` and logical `border-e` / `ps-3 pe-3`). Under internationalized RTL (Right-to-Left) reading flows, mixing physical offsets like `left` with logical paddings like `ps` (padding-start) produces clipping. The UI should standardize on logical properties:
   - Replace `width` and `height` with `inline-size` and `block-size`.
   - Replace `left`/`right` with `start`/`end` (or use tailwind logical offsets like `start-0` instead of `left-0`).
   - Replace `margin-left` / `padding-right` with `margin-inline-start` / `padding-inline-end`.
2. **Native HTML Components vs. Custom Focus Overlays**  
   The login modal and sidebar drawer use custom `div` overlays and manually managed state machines for rendering focus traps. Standard web APIs provide the native HTML `<dialog>` element and the Popover API, which automatically manage focus, ESC-key dismissals, and z-index layering at the browser engine level. Replacing custom overlays with native `<dialog>` elements improves accessibility (ARIA compliance) and performance.
3. **Render Blocking Cascade**  
   The CSS file loads Google Fonts using `@import` on line 1, which blocks parsing until the font request resolves. External script loads in `index.html` should use the `defer` or `async` keywords, and fonts should be preloaded or bundled locally to avoid network cascades.

---

## 6. Actionable Refactoring Diffs

Below are three production-grade refactoring diffs targeting critical issues identified during this audit.

### 6.1 Diff 1: Fixing Firebase Token Auth Bypass (`worker/src/lib/auth-utils.ts`)

This refactoring ensures that the mock Firebase token bypass only triggers if the backend `apiKey` is explicitly configured for local testing. It prevents attackers from using mock headers on production servers.

```diff
diff --git a/worker/src/lib/auth-utils.ts b/worker/src/lib/auth-utils.ts
index c6b92a5..81ac77e 100644
--- a/worker/src/lib/auth-utils.ts
+++ b/worker/src/lib/auth-utils.ts
@@ -10,9 +10,9 @@ import type { Env, AuthUser, HonoSchema } from '../types';
  */
 export async function verifyFirebaseToken(token: string, projectId: string, apiKey: string): Promise<AuthUser> {
-  // Support mock tokens for local testing when Firebase API key is mock or token starts with mock-token-
-  if (apiKey === 'mock_firebase_key_for_testing' || token.startsWith('mock-token-')) {
-    const uid = token.startsWith('mock-token-') ? token.substring(11) : 'mock-user-123';
+  // Support mock tokens for local testing ONLY when Firebase API key is explicitly configured for testing
+  if (apiKey === 'mock_firebase_key_for_testing') {
+    const uid = token.startsWith('mock-token-') ? token.substring(11) : 'mock-user-123';
     return {
       uid,
       email: `${uid}@rethink.local`
     };
   }
```

---

### 6.2 Diff 2: Fixing FSM State Machine Lock (`worker/src/lib/fsm.ts`)

This refactoring prevents distressed users from being locked in `Active_Listening` indefinitely when their emotional confidence remains high. It introduces a maximum streak limit (e.g. `newStreak >= 5`) to force the transition to `CBT_Stripping` for intervention.

```diff
diff --git a/worker/src/lib/fsm.ts b/worker/src/lib/fsm.ts
index e56b82b..349f7d4 100644
--- a/worker/src/lib/fsm.ts
+++ b/worker/src/lib/fsm.ts
@@ -275,12 +275,15 @@ function transitionFromActiveListening(
   if (intent.type === 'emotional') {
     const newStreak = ctx.emotionalStreak + 1;
 
-    // 延迟进入 CBT：如果情绪仍然非常高涨，继续留在倾听状态兜底
-    if (newStreak >= 3 && intent.confidence < 0.7) {
+    // 延迟进入 CBT：如果情绪仍然非常高涨，继续留在倾听状态兜底。但为防止无限锁死，设置最大 streak 阈值强制切入 CBT
+    if ((newStreak >= 3 && intent.confidence < 0.7) || newStreak >= 5) {
       return {
         nextState: 'CBT_Stripping',
-        trigger: `情绪降温且已倾听充分 (streak=${newStreak}, confidence=${intent.confidence})`,
+        trigger: newStreak >= 5
+          ? `达到最大倾听阈值强制切入 CBT (streak=${newStreak}, confidence=${intent.confidence})`
+          : `情绪降温且已倾听充分 (streak=${newStreak}, confidence=${intent.confidence})`,
         contextUpdate: {
           emotionalStreak: 0,
           abcCompleted: false,
           restructureAccepted: false,
         },
       };
     }
```

---

### 6.3 Diff 3: Fixing Webcam Analysis setInterval Overlap (`web/src/hooks/useFaceEmotion.ts`)

This refactoring replaces the overlapping `setInterval` timer with a self-scheduling `setTimeout` loop. The execution of each loop is wrapped in a `try...catch...finally` block to guarantee the next analysis tick is scheduled safely without overlapping concurrent analysis threads.

```diff
diff --git a/web/src/hooks/useFaceEmotion.ts b/web/src/hooks/useFaceEmotion.ts
index bbf4f17..22d9a3b 100644
--- a/web/src/hooks/useFaceEmotion.ts
+++ b/web/src/hooks/useFaceEmotion.ts
@@ -100,7 +100,7 @@ export function useFaceEmotion() {
   const videoRef = useRef<HTMLVideoElement | null>(null);
   const streamRef = useRef<MediaStream | null>(null);
-  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
+  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const isActiveRef = useRef(false);
   const historyRef = useRef<Record<EmotionLabel, number>[]>([]);
   const canvasRef = useRef<HTMLCanvasElement | null>(null);
@@ -121,98 +121,104 @@ export function useFaceEmotion() {
   // 分析单帧情绪
   const analyzeFrame = useCallback(async () => {
     console.log('[analyzeFrame] entered. api:', !!window.faceapi, 'video:', !!videoRef.current, 'active:', isActiveRef.current);
-    const api = window.faceapi;
-    if (!api || !videoRef.current || !isActiveRef.current) return;
-
-    // Stop running if the document is hidden to conserve CPU
-    if (typeof document !== 'undefined' && document.hidden) return;
-
-    const video = videoRef.current;
-    console.log('[analyzeFrame] video readyState:', video.readyState, 'paused:', video.paused);
-    if (video.readyState < 2 || video.paused) return;
-
     try {
+      const api = window.faceapi;
+      if (!api || !videoRef.current || !isActiveRef.current) return;
+
+      // Stop running if the document is hidden to conserve CPU
+      if (typeof document !== 'undefined' && document.hidden) return;
+
+      const video = videoRef.current;
+      console.log('[analyzeFrame] video readyState:', video.readyState, 'paused:', video.paused);
+      if (video.readyState < 2 || video.paused) return;
+
       const detection = await api
         .detectSingleFace(video, new api.SsdMobilenetv1Options({ minConfidence: 0.4 }))
         .withFaceLandmarks()
         .withFaceExpressions();
       console.log('[analyzeFrame] detection resolved:', detection);
 
       if (!isActiveRef.current) return;
 
       if (!detection) {
         clearCanvas();
         return;
       }
 
       // 绘制覆盖层
       if (canvasRef.current) {
         const displaySize = { width: video.videoWidth, height: video.videoHeight };
         if (displaySize.width > 0 && displaySize.height > 0) {
           api.matchDimensions(canvasRef.current, displaySize);
           const resizedDetections = api.resizeResults(detection, displaySize);
           const ctx = canvasRef.current.getContext('2d');
           if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
           }
           api.draw.drawDetections(canvasRef.current, resizedDetections);
           api.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
         }
       }
 
       const expressions = detection.expressions as unknown as Record<EmotionLabel, number>;
 
       // 引入指数移动平均（EMA）进行平滑，而不是简单的窗口平均。
       const isE2E = typeof window !== 'undefined' && (window as unknown as { __mockEmotionConfidence?: number }).__mockEmotionConfidence !== undefined;
       const ALPHA = isE2E ? 1.0 : 0.85; 
       
       let avgExpressions: Record<EmotionLabel, number>;
       if (!historyRef.current || historyRef.current.length === 0) {
         avgExpressions = { ...expressions };
         historyRef.current = [avgExpressions];
       } else {
         avgExpressions = historyRef.current[0];
         for (const k of Object.keys(expressions) as EmotionLabel[]) {
           avgExpressions[k] = avgExpressions[k] * (1 - ALPHA) + (expressions[k] || 0) * ALPHA;
         }
       }
 
       const entries = Object.entries(avgExpressions) as [EmotionLabel, number][];
       
       // 寻找非 neutral 的最高分数
       let maxNonNeutralLabel: EmotionLabel = 'neutral';
       let maxNonNeutralScore = 0;
       for (const [k, v] of entries) {
         if (k !== 'neutral' && v > maxNonNeutralScore) {
           maxNonNeutralScore = v;
           maxNonNeutralLabel = k;
         }
       }
 
       let topLabel: EmotionLabel = 'neutral';
       let topScore = avgExpressions['neutral'] || 0;
 
       // 核心微表情放大器
       if (maxNonNeutralLabel !== 'neutral' && maxNonNeutralScore > 0.05) {
         topLabel = maxNonNeutralLabel;
         topScore = maxNonNeutralScore;
       }
 
       const allEmotions: Partial<Record<EmotionLabel, number>> = {};
       for (const [k, v] of entries) {
         allEmotions[k] = Math.round(v * 100) / 100;
       }
 
       setCurrentEmotion({
         label: topLabel,
         confidence: Math.round(topScore * 100),
         allEmotions,
       });
     } catch (err) {
       console.error('[analyzeFrame] error:', err);
+    } finally {
+      // Self-schedule the next check to avoid setInterval overlaps
+      if (isActiveRef.current) {
+        intervalRef.current = setTimeout(analyzeFrame, 800);
+      }
     }
   }, [clearCanvas]);
 
   const stopCamera = useCallback(() => {
     isActiveRef.current = false;
 
     if (intervalRef.current) {
-      clearInterval(intervalRef.current);
+      clearTimeout(intervalRef.current);
       intervalRef.current = null;
     }
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
     }
     if (videoRef.current) {
       videoRef.current.srcObject = null;
       videoRef.current.onloadedmetadata = null;
     }
 
     setIsCameraActive(false);
     setCurrentEmotion(null);
     historyRef.current = [];
     clearCanvas();
   }, [clearCanvas]);
 
   const startCamera = useCallback(async () => {
     // Prevent starting multiple sessions concurrently
     if (isActiveRef.current || streamRef.current) {
       return;
     }
 
     isActiveRef.current = true;
     setError(null);
 
     // 加载模型（只加载一次）
     if (!modelsLoaded) {
       setIsModelLoading(true);
       try {
         await loadModels();
         setIsModelLoaded(true);
       } catch (err: unknown) {
         setError(`情绪识别模型加载失败: ${err instanceof Error ? err.message : String(err)}`);
         setIsModelLoading(false);
         isActiveRef.current = false;
         return;
       }
       setIsModelLoading(false);
     }
 
     // Check if stopCamera was called while loading models
     if (!isActiveRef.current) {
       return;
     }
 
     // 请求摄像头权限
     try {
       const stream = await navigator.mediaDevices.getUserMedia({
         video: { width: 320, height: 240, facingMode: 'user' },
         audio: false,
       });
 
       // Secondary check: if stopCamera was called while waiting for getUserMedia
       if (!isActiveRef.current) {
         stream.getTracks().forEach(track => track.stop());
         return;
       }
 
       streamRef.current = stream;
 
       if (videoRef.current) {
         videoRef.current.srcObject = stream;
         videoRef.current.onloadedmetadata = () => {
           videoRef.current?.play().catch(() => {});
         };
       }
 
       setIsCameraActive(true);
 
-      // Clean any accidental dangling interval before setting a new one
-      if (intervalRef.current) clearInterval(intervalRef.current);
-      // 每 800ms 分析一帧（平衡性能与实时性）
-      intervalRef.current = setInterval(analyzeFrame, 800);
+      // Clean any accidental dangling timer before setting a new one
+      if (intervalRef.current) clearTimeout(intervalRef.current);
+      // Begin the self-scheduling analysis loop
+      intervalRef.current = setTimeout(analyzeFrame, 800);
     } catch (e: unknown) {
       console.error('[startCamera] error name:', e instanceof Error ? e.name : typeof e, 'message:', e instanceof Error ? e.message : String(e));
       stopCamera();
       if (e instanceof Error) {
         if (e.name === 'NotAllowedError') {
           setError('摄像头权限被拒绝，请在浏览器设置中允许访问');
         } else if (e.name === 'NotFoundError') {
           setError('未找到摄像头设备');
         } else {
           setError('无法启动摄像头');
         }
       } else {
         setError('无法启动摄像头');
       }
     }
   }, [analyzeFrame, stopCamera]);
