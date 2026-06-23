# Codebase Audit & Architectural Analysis Report

This report presents a comprehensive audit of the **RE-THINK Agent** codebase, covering the UI & Mobile Responsiveness, Architecture & Tech Debt, and Test Readiness & API Routes.

---

## 1. UI & Mobile Responsiveness

The front-end is built using React, Vite, and Tailwind CSS, following a custom Google Gemini/Material Design 3 (MD3) aesthetic.

### A. Tailwind Design System & Custom Stylesheets
- **Color Palette (`web/tailwind.config.js`)**: Integrates MD3-style surface tokens:
  - `surface.dim` (`#F0F4F9`): Gemini's signature background color.
  - `surface.container` (`#E8EDF2`) and `surface.container-high` (`#DDE3EA`): Elevated background containers.
  - `on.surface` (`#1F1F1F`) and `on.surface-variant` (`#5F6368`): Primary and secondary text colors.
  - `gemini.blue` (`#4285F4`), `gemini.purple` (`#A142F4`), and CBT stage semantic colors.
- **Typography**: Display fonts use `"Google Sans"`, and UI body text uses `"Google Sans Text"`.
- **CSS Layers (`web/src/index.css`)**: 
  - `@layer components` defines custom Gemini elements: `.gemini-gradient-text` (sparkle linear gradient text), `.gemini-thinking-glow` (pulsing blur background), and `.suggestion-chip` (rounded pill hover styles).
  - `@layer utilities` defines Markdown rendering styles: `.gemini-prose` provides customized spacing, lists, code block styling, and blockquote accents.

### B. Layout Responsiveness (Scale down to 375px)
- **Safe-Area Insets**: The application uses safe area margins to support notches and home indicators on mobile devices:
  - Mobile header: `pt-[max(env(safe-area-inset-top),12px)]`
  - Input bar container: `pb-[calc(max(env(safe-area-inset-bottom),24px))]`
- **Mobile Sidebar Collapsing**: 
  - On viewports `< 768px` (`md` breakpoint), the sidebar is hidden and triggered by a top-left hamburger menu.
  - Sidebar width is set to `w-[min(360px,88vw)]`. On a 375px screen, this scales down to `330px`, leaving a `45px` clickable gutter to close the overlay.
- **iOS Safari Autofocus/Auto-zoom Prevention**:
  - Input textareas (`InputBar.tsx`) and fields (`LoginModal.tsx`) enforce a minimum font size of `text-[16px]` on mobile. This stops iOS Safari from automatically zooming into text inputs on focus, preserving layout boundaries.
- **Auth Modal Boundaries**:
  - The `LoginModal` scales to `max-w-[calc(100vw-2rem)]` (343px on 375px screens) and applies `max-h-[85dvh] overflow-y-auto` to prevent viewport overflow on smaller devices. Graphic panels are hidden on mobile using `hidden md:flex`.

### C. Z-Index Hierarchy
The z-index layout follows a structured stack to ensure critical modals overlay standard views:
1. `z-[100]`: `CrisisOverlay` (crisis hotline/prevention screen) and `LoginModal` (authentication window). Both must cover the entire viewport.
2. `z-50`: `SessionSidebar` overlay, `LoginWall` container, and the error snackbar.
3. `z-40`: Desktop Profile Pill and History trigger buttons.
4. `z-30`: `InputBar` wrapper (floats at the bottom above chat logs).
5. `z-20`: Mobile header.
6. `z-10`: Chat panel container/workspace.
7. `z-0`: `ArtMeshBackground` (WebGL canvas), `AmbientGlow`, and `SunlightBackground`.

### D. Animations & Shaders
- **WebGL Particle Shader (`ArtMeshBackground.tsx`)**: Renders a React Three Fiber `Canvas` with custom GLSL vertex and fragment shaders. Calculates dynamic wave heights, mouse magnetic ripples, chromatic flow, and embeds two `Sparkles` particle systems representing warm sunlight dust.
- **Framer Motion**:
  - `LoginWall.tsx`: Smooth entry scale and blur effect on the main "Enter" button.
  - `LoginModal.tsx`: Parallax entry transitions utilizing `scale: 0.95` and `filter: 'blur(20px)'`.
  - `GeminiWelcome.tsx`: Bouncy spring motion (`stiffness: 300`, `damping: 18`) applied to the logo on mount.
- **CSS Keyframes (`tailwind.config.js`)**: Runs `messageIn` (scales up and moves y-axis for incoming chat bubbles), `shimmerGlow` (rotates gradients for thinking status), and `sparkleMesh` (shifts text gradients).

---

## 2. Architecture & Tech Debt

### A. Component Bloat & Monoliths
- **`AdminApp.tsx` (396 lines)**: *Monolithic*. Combines the master login layout, database table rendering, inline state editing, and API actions in a single file. Should be refactored into:
  - `web/src/components/admin/AdminLogin.tsx`
  - `web/src/components/admin/AdminDashboard.tsx`
- **`MessageBubble.tsx` (237 lines)**: *Contains high dead-code bloat*. 
  - Imports 13 unused icons from `lucide-react` (lines 5-19).
  - Defines 5 unused lookup tables: `INTENT_LABEL`, `EMOTION_LABEL`, `RISK_LABEL`, `RISK_COLOR`, and `INTENT_COLOR` (lines 25-75).
  - Defines 3 unused helper functions: `fsmLabel`, `safeArray`, and `scoreTone` (lines 60-86).
  - Defines 3 unused markup components: `AuditSection`, `AuditRow`, and `AuditBadge` (lines 88-120).
  - Extracts 7 unused variables from `techChain`: `ragSources`, `ragSnippets`, `ragScores`, `retrievedChunks`, `usedFrameworks`, `riskLevel` (lines 164-169).
  - Maintains 2 unused state hooks: `showTechChain` and `expandedRag` (lines 145-146).
  - *Context*: This dead code represents a legacy RAG/TechChain explainability panel that was stripped from the UI but never cleaned from the codebase.
- **`StageIndicator.tsx` (171 lines)**: *Dead File*. This component is fully defined but is **never imported or rendered** anywhere in the active application.
- **`SunlightBackground.tsx` (233 lines)**: *Dead File*. Renders a custom 2D canvas sunlight beam background, but is bypassed in favor of `ArtMeshBackground.tsx`.
- **`OnboardingOverlay.tsx` (4 lines)**: *Deprecated File*. Kept as an empty file with comments indicating it was replaced by the conversational icebreaker system.

### B. Zustand Store Evaluation
- The Zustand stores (`authStore.ts`, `chatStore.ts`, `sessionStore.ts`) are **well-designed** and strictly typed.
- Actions use immutable array updates (e.g. `messages: [...state.messages, newMsg]`).
- Clean event-driven state syncing is implemented: `authStore` dispatches a window event (`'auth:logout'`), which is caught by `chatStore` and `sessionStore` to automatically reset their states, preventing state leaks.
- Handles authorization failures gracefully by listening for `'auth:unauthorized'` events to auto-logout the user.

### C. TypeScript Type Safety & Strict Flags
- **Implicit any / lax typing**:
  - `as any` casting is used to bypass type checks:
    - `MessageBubble.tsx:163`: `const tc = message.techChain as any;`
    - `useChat.ts:134`: `setLastMessageTechChain(techChain as any);` (bypasses union type checks since the SSE model string intent is cast to a strict literal union).
    - `useFaceEmotion.ts:2`: `const faceapi = (window as any).faceapi;` (bypasses window object extensions).
- **TypeScript Compiler Settings (`web/tsconfig.app.json`)**:
  - `"strict": true` is **missing** in the frontend config (but is enabled in the backend `worker/tsconfig.json`).
  - *Risk*: Without strict checking, React components do not enforce null/undefined assertions, increasing the risk of runtime crashes when accessing nested data (e.g. optional fields like `message.techChain`).

---

## 3. Test Readiness & API Routes

### A. Test Libraries Audit
- There are **no testing frameworks** (Vitest, Jest, Playwright, Cypress, MSW, etc.) installed in `package.json` for either the `web` workspace, `worker` workspace, or root.
- The project only contains a single node-based endpoint integration test: `scripts/agent-smoke-test.mjs` (runs via `npm run test:agent` in the root). This test sends HTTP requests to the live deployment API (`https://rethink.buleegasy.space`) and verifies SSE properties.

### B. Cloudflare Worker API Routes (`worker/src/routes/`)

Below is the list of active backend HTTP routes, methods, and payload interfaces:

| Route | Method | Headers/Auth | Request Payload | Response Payload | Description |
|---|---|---|---|---|---|
| `/api/auth/register` | `POST` | None | `{ username, password, invitationCode, turnstileToken }` | `{ success: boolean, user: User, token: string }` | Registers account. Validates Cloudflare Turnstile CAPTCHA and checks/increments invitation code usage in D1 database. |
| `/api/auth/login` | `POST` | None | `{ username, password, turnstileToken }` | `{ success: boolean, user: User, token: string }` | Authenticates user against Firebase Auth. |
| `/api/auth/test-login` | `POST` | None | `{}` | `{ success: true, user: User, token: string }` | Bypasses CAPTCHA and Firebase Auth to log in a pre-seeded guest account. |
| `/api/auth/bind-session` | `POST` | `Authorization: Bearer <token>` | `{ sessionId }` | `{ success: boolean, message: string }` | Associates an anonymous chat session ID to the logged-in user. |
| `/api/auth/sessions` | `GET` | `Authorization: Bearer <token>` | None | `{ success: true, sessions: SessionSummary[] }` | Fetches all session summaries (titles, stage indices) for the logged-in user. |
| `/api/auth/sessions/:id` | `GET` | `Authorization: Bearer <token>` | None | `{ success: true, session: SessionDetail }` | Returns detailed chat logs and FSM context. |
| `/api/chat` | `POST` | `Authorization: Bearer <token>` | `{ messages: ChatMessage[], stream?: boolean, sessionId?: string, profile?: UserProfile, facialEmotion?: Emotion, model?: string }` | SSE Stream (`data: {...}`) or JSON payload with FSM details. | Processes chat text. Triggers intent routing, RAG checks, risk scoring, LLM generation, and executes FSM transitions before saving to D1. |
| `/api/onboarding/analyze` | `POST` | None | `{ text: string }` | `{ weather, safetyIsland, stressor }` | Extracts user profile dimensions from a single introductory sentence via LLM. |
| `/api/survey/submit` | `POST` | None | `{ respondentId, openFeedback, answers... }` | `{ success: true, id: string }` | Stores survey answers in D1 alongside location metadata from headers. |
| `/api/survey/results` | `GET` | None | None | `{ total: number, results: SurveyRecord[] }` | Returns all survey submissions. |
| `/api/knowledge/ingest` | `POST` | None | `{ title: string, content: string, sourceFile?: string }` | `{ success: true, documentId, chunkCount }` | Parses and indexes Markdown document into RAG database chunks. |
| `/api/knowledge/list` | `GET` | None | None | `{ documents: DocumentSummary[] }` | Lists all knowledge base documents. |
| `/api/knowledge/:id` | `DELETE` | None | None | `{ success: true }` | Deletes a knowledge base document. |
| `/api/knowledge/query` | `POST` | None | `{ query: string, topK?: number, minScore?: number }` | `{ success: true, chunks, scores, sourceDocuments }` | Performs direct vector search queries. |
| `/api/admin/invitations` | `GET` | `x-admin-token` header | None | `{ codes: InvitationCode[] }` | Lists all active invitation codes. |
| `/api/admin/invitations` | `POST` | `x-admin-token` header | `{ code?, maxUses? }` | `{ success: true, code, max_uses }` | Creates a new invitation code. |
| `/api/admin/invitations/:code` | `PUT` | `x-admin-token` header | `{ maxUses: number }` | `{ success: true }` | Updates code limits. |
| `/api/admin/invitations/:code` | `DELETE` | `x-admin-token` header | None | `{ success: true }` | Deletes an invitation code. |

---

## 4. Testing Framework Recommendations

To establish robust testing coverage, we recommend installing the following libraries:
- **Unit & Component Testing**: **Vitest** (fast Vite-native test runner) + **@testing-library/react** (React DOM testing utilities).
- **API Mocking**: **msw** (Mock Service Worker) to intercept network requests.
- **E2E Testing**: **Playwright** (cross-browser automated flow runner).

Following the layout rules in the project, test files must be **co-located** with their source files:

### A. Unit Tests (Backend Logic)
- **Target Files**:
  - `worker/src/lib/fsm.ts` -> test FSM states and transitions (e.g. `Onboarding` to `Active_Listening`, and transition to `Crisis_Escalation` when high risk is detected).
  - `worker/src/lib/intent-router.ts` -> verify trigger phrase mapping and classifications.
  - `worker/src/lib/risk.ts` -> verify risk level output matches inputs.
  - `worker/src/lib/chunker.ts` -> verify markdown parsing and text split overlaps.
- **Location**: Co-locate next to logic files under `worker/src/lib/__tests__/` (e.g. `worker/src/lib/__tests__/fsm.test.ts`).

### B. Component Tests (Frontend UI)
- **Target Components**:
  - `MessageBubble.tsx`: Assert correct markdown formatting, avatar visibility, and error message styling.
  - `InputBar.tsx`: Test character limits, textarea auto-resizing, and send handlers.
  - `LoginModal.tsx`: Verify CAPTCHA callbacks and error boundaries.
- **Location**: Co-locate next to components under `web/src/components/chat/__tests__/` (e.g. `web/src/components/chat/__tests__/MessageBubble.test.tsx`).

### C. API Route Tests (Endpoint Integration)
- **Target Endpoints**:
  - Test `/api/auth` (token verification, D1 binding).
  - Test `/api/chat` (mock LLM stream responses, SSE line formatting).
  - Test `/api/survey` (location parsing).
- **Location**: Co-locate next to routes under `worker/src/routes/__tests__/` (e.g. `worker/src/routes/__tests__/auth.test.ts`).

### D. E2E Tests (Full User Flow)
- **Coverage**:
  - Walk user through entering the museum landing page -> accessing guest mode -> selecting an emoji -> receiving a chat message -> inputting "I want to harm myself" -> verifying z-index 100 `CrisisOverlay` blocks input.
- **Location**: Place under `web/e2e/` (e.g. `web/e2e/journey.spec.ts`).
