# RE-THINK Project Comprehensive Audit Report

**Date**: 2026-06-27  
**Workspace**: `/Users/chenhaoran/工程文件/心理大赛/`  
**Auditor**: teamwork_preview_orchestrator (Audit Milestone)

---

## 1. Executive Summary

This report presents the findings from a comprehensive, read-only system audit of the **RE-THINK** digital art & psychological safety sanctuary project. The audit covers the React + Vite frontend (`web/`), the Cloudflare Worker backend (`worker/`), and the automated E2E and API verification suites.

### Overall System Status: **HEALTHY BUT REQUIRING RECONCILIATION**
- **Compilation & Test Suites**: The codebase compiles cleanly, and automated unit/E2E test suites pass successfully.
- **Frontend Quality**: High-density cinematic layouts and motion designs are successfully integrated. However, there are significant opportunities to transition from custom, heavy JavaScript-based patterns to modern browser-native APIs (following `modern-web-guidance` standards).
- **Backend Architecture**: The Hono router, Finite State Machine (FSM) state engine, custom SSE JSON streaming parser, and Vectorize RAG query fallback mechanisms are highly robust and compile without issue.
- **Critical Production Blocker**: A model mapping mismatch exists on the backend: the default client model `deepseek-v4-flash` maps to `google/gemini-3.1-flash`, which OpenRouter rejects with a `400` error code. This prevents chat streaming in production without manual requests modification or intercepting.

---

## 2. Automated Test Execution Results

Programmatic verification of current test suites was executed by running commands via a QA subagent.

### A. Playwright E2E UI Tests
- **Command**: `npm run test:e2e` (ran from workspace root)
- **Result**: **PASSED** (1 test run, 1 passed in 9.3 seconds)
- **Coverage**: The E2E test (`web/e2e/journey.spec.ts`) simulates the entire landing page guest journey, clicking "访客体验" (Guest Access) and verifying navigation into the sanctuary greeting interface.
- **Caveat**: All backend endpoints are mocked during this E2E test. Thus, while it verifies UI-side navigation and client routing correctly, it does not validate live backend APIs or OpenRouter generation pathways.

### B. Live Backend API Verification
- **Command**: `npm run test:api` (executes `node scripts/api-verify.mjs`)
- **Result**: **PASSED**
- **Coverage**:
  - `POST /api/auth/test-login` successfully bypassed auth and returned a JWT guest token.
  - `GET /api/auth/sessions` successfully retrieved user session lists (returned `0` active sessions).

---

## 3. Browser Flow & Manual Testing Findings

To verify real-world system behavior, a live user flow was simulated programmatically using Playwright without API mocks, starting both the Vite dev server (port 5173) and wrangler dev worker (port 8787).

### A. Landing Page & Login Flow
- **Layout Spacing**: Programmatic checks on the bounding boxes of title text, subtitle, and primary entry buttons (Guest/Member orbs) show **zero overlaps**. The layout is highly responsive and visually stable.
- **Auth Flow**: Clicking the guest entry orb successfully contacts `/api/auth/test-login`, validates authentication, and renders the onboarding header ("你好，欢迎来到这里") and start button ("开始对话") without layout shifts.

### B. Chat Intervention & SSE Streaming (The Model Mapping Bug)
- **Simulated Input**: "我考试考砸了" (intended to trigger `academic_stress` intent).
- **Default Connection Failure**: Sending the message resulted in an immediate streaming failure.
  - **Console Error**: `SSE Error: BadRequestError: 400 google/gemini-3.1-flash is not a valid model ID`.
  - **Root Cause**: The client-side defaults to requesting the `deepseek-v4-flash` model. In `worker/src/lib/llm.ts` (lines 301–305), the worker maps this model to `google/gemini-3.1-flash` for OpenRouter. OpenRouter rejects this ID.
- **Connection Recovery**: After intercepting and rewriting the model parameter to `llama-3.4` (which maps to OpenRouter's `meta-llama/llama-3.3-70b-instruct`), the request succeeded.
- **Streaming Result**: The server successfully returned text streams in real time. The final reply received was: *"怎么了，考试没通过？"*
- **FSM State Transitions**: Upon detecting a specific stress input during the onboarding stage, the backend FSM correctly bypassed standard onboarding questions and successfully transitioned the session from `Onboarding` to `Active_Listening`.

### C. Chat Interface Layout Check
- Bounding box analysis of the chat workspace showed that the absolute-positioned bottom `Input Bar` physically overlaps the lower bounding box of the `Chat Panel`.
- **UX Evaluation**: This overlap is **intentional by design** to support the floating cinematic look. Text clipping is prevented by a custom bottom spacer element (`bottomRef` height of `220px` to `280px` inside `ChatPanel.tsx`) which pushes message content scroll boundaries well above the input container.

### D. Vectorize RAG Pipeline Behavior
- During live local testing, wrangler logged: `▲ [WARNING] [RAG] Retrieval failed, proceeding without knowledge context: TypeError: Cannot read properties of undefined (reading 'query')`.
- **Evaluation**: The local wrangler dev server lacks live Vectorize index bindings. However, the backend router handles this failure gracefully, falling back to the standard LLM prompt generation path without crashing.

---

## 4. Frontend UI/UX and Code Quality Audit

This section details codebase audits against guides from the `modern-web-guidance` skill.

### A. Dialog and Modal Overlays
- **Current Code**:
  - `web/src/components/auth/LoginModal.tsx` implements custom overlays using fixed positioning and `framer-motion` opacity transitions.
  - `web/src/components/layout/SessionSidebar.tsx` manages a manual keyboard focus trap inside a React `useEffect` hook (lines 41–100) to keep `Tab` keys contained.
- **Modern Web Guidance Reference**: `declarative-dialog-popover-control` / `html`
- **Assessment**: Legitimate modal dialogues should use the native HTML `<dialog>` element.
  - Calling `.showModal()` puts the element directly in the browser's top layer (resolving any z-index or stacking context issues natively).
  - Native `<dialog>` handles focus trapping, backdrops (`::backdrop` styling), and closing via `Esc` automatically.
  - **Recommendation**: Replacing the manual focus trapping in `SessionSidebar.tsx` with a native `<dialog>` or Popover element would eliminate roughly 100 lines of complex, manual keyboard event listeners.

### B. Accessibility & Form Inputs
- **Current Code**:
  - Inputs inside `LoginModal.tsx` and `AdminLogin.tsx` do not define `id`, `name`, or `autoComplete` attributes.
  - They lack visible `<label>` tags, relying entirely on input `placeholder` text (e.g. `placeholder="用户名"`).
- **Modern Web Guidance Reference**: `forms` / `autofill-sign-in-form`
- **Assessment**:
  - Placeholders must not replace labels. Screen readers cannot parse placeholders reliably, violating basic accessibility (a11y) rules.
  - Missing autocomplete tags prevent browser autofill and password managers from functioning.
  - **Recommendation**: Add visible (or screen-reader-only `sr-only`) `<label>` tags bound to unique input `id`s. Add `name="username"` and `autocomplete="username"` / `autocomplete="current-password"` to support autofill.

### C. Motion & CSS Entry/Exit Transitions
- **Current Code**:
  - Simple modal displays and sidebar drawers use `framer-motion` wrappers to animate entry and exit states.
- **Modern Web Guidance Reference**: `animate-element-entry-exit`
- **Assessment**:
  - Modern CSS natively supports animating `display: none` containers on mount and unmount using `@starting-style` and `transition-behavior: allow-discrete`.
  - **Recommendation**: Transitioning simple slide-in/fade dialog entries to native CSS properties reduces bundle size by minimizing JavaScript execution overhead, helping lower the Interaction to Next Paint (INP) score.

### D. Scrollbar Styles
- **Current Code**:
  - `web/src/index.css` overrides scrollbars using legacy, non-standard `-webkit-scrollbar` pseudo-selectors.
- **Modern Web Guidance Reference**: `css`
- **Assessment**:
  - Webkit scrollbar selectors are non-standard and rejected by several platforms.
  - **Recommendation**: Adopt the standard CSS properties `scrollbar-color` and `scrollbar-width` for modern layout engines, leaving legacy Webkit rules only as fallbacks.

### E. Spacing & CSS Logical Properties
- **Current Code**:
  - Layout spacing and directional paddings make heavy use of modern Tailwind logical classes (e.g. `ps-4`, `pe-4`, `border-e`, `start-0`).
- **Modern Web Guidance Reference**: `logical-properties`
- **Assessment**: **EXCELLENT**. The project demonstrates full compliance, ensuring natural layout orientation support if localized to RTL (Right-to-Left) languages.

---

## 5. Backend Code & API Architecture Audit

### A. DB Schema (D1 SQL)
- The project leverages 4 main tables:
  1. `sessions`: Tracks JSON serialized chats, current stage (1–5), FSM state, and context metadata.
  2. `knowledge_documents`: Houses RAG sources metadata.
  3. `surveys`: Stores user feedback and appends geographical metadata from Cloudflare headers.
  4. `invitation_codes`: Regulates registration usage limits.

### B. Intent Classifier & State Machine (FSM)
- The classification engine in `worker/src/lib/intent-router.ts` combines static keyword regex matchers with Gemini validations.
- The state engine (`worker/src/lib/fsm.ts`) governs CBT progression stages. It is highly robust, supporting dynamic skips (e.g., jump from Onboarding to Active Listening when user mentions concrete stress).

### C. Vectorize RAG & Embedding Calibrations
- Embedding is generated via `@cf/baai/bge-m3`. Text content is stored directly inside vectorize metadata fields, speeding up queries.
- **The Scoring Hack**: In `worker/src/routes/ingest.ts` (lines 120–122), the query router injects a hardcoded similarity score boost of `+0.08` exclusively for the document named `CBT 行为激活与情绪缓解微习惯指南` to bypass test score thresholds:
  ```typescript
  if (doc === 'CBT 行为激活与情绪缓解微习惯指南') {
    const calibratedScore = Math.min(0.99, result.scores[i] + 0.08);
  ```
- **Evaluation**: While this ensures high similarity scores in benchmark scripts, it represents technical debt. Calibration factors should be generalized or configurable rather than hardcoded to a specific document name.

---

## 6. Categorized and Prioritized Audit Findings

Below is the prioritized registry of items identified during the audit:

| Severity | Category | Target File / Component | Issue Description | Recommended Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **High** | Backend / LLM | `worker/src/lib/llm.ts` | Default client model `deepseek-v4-flash` maps to `google/gemini-3.1-flash` which OpenRouter rejects with a `400 Bad Request` error. | Update backend model mapping dictionary to a valid OpenRouter model (e.g. `google/gemini-2.5-flash` or `meta-llama/llama-3.3-70b-instruct`). |
| **Medium** | Accessibility | `LoginModal.tsx`, `AdminLogin.tsx` | Inputs lack visible/associative `<label>` tags and do not declare `name` or `autocomplete` attributes. | Insert bound `<label>` tags with `id` bindings and apply standard `autocomplete` tokens. |
| **Medium** | Backend / RAG | `worker/src/routes/ingest.ts` | Hardcoded `+0.08` calibration boost exists in the ingestion query for a single specific document name. | Generalize the similarity scoring weight parameters into a configurable system token or configuration object. |
| **Low** | CSS / Layout | `SessionSidebar.tsx` | Custom focus-trap implementation in `useEffect` adds ~100 lines of complex event listener code. | Replace the custom focus-trap overlay with a native HTML `<dialog>` element wrapper using `.showModal()`. |
| **Low** | Styling | `web/src/index.css` | Relies on non-standard `::-webkit-scrollbar` pseudo-selectors for custom scrollbar styling. | Add standard CSS properties `scrollbar-color: <thumb> <track>` and `scrollbar-width: thin` for modern browsers. |
| **Low** | Bundle Size | `LoginModal.tsx` | Framer Motion library imported for simple entry/exit transitions. | Utilize native CSS `@starting-style` and `transition-behavior: allow-discrete` to animate layout entry natively. |

---

## 7. Audit Attestation

This audit was conducted strictly as a **read-only** assessment. No project source files, build scripts, or databases have been created, modified, or deleted. All execution steps were performed in a sandbox context with temporary servers.
