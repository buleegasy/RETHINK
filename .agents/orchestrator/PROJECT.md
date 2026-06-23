# Project: RE-THINK Agent Refactoring, Optimization, and Automated Testing

## Architecture
RE-THINK Agent is a psychotherapeutic safety sanctuary comprised of a React + Vite + Tailwind frontend and a Cloudflare Worker backend.
- **Frontend State**: Controlled by Zustand stores (`authStore`, `chatStore`, `sessionStore`).
- **Backend API**: Cloudflare Worker using Hono. Communicates with LLMs, manages chat logs, surveys, and vector search chunks in D1/Vectorize databases.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Layout Restructuring | Conditionally render ChatPanel vs LoginWall in App.tsx | None | DONE |
| 2 | Premium Animation | Implement DecryptText/BlurText animations | M1 | DONE |
| 3 | Code Verification | Run compilation, verification scripts, and check for overlaps | M2 | DONE |
| 4 | Test Suite & API Validation Setup | Establish Vitest, Playwright, and backend API validation script. Write initial E2E and API tests | None | IN_PROGRESS |
| 5 | Architectural Refactoring & TS Strictness | Remove dead files/code, split monolithic AdminApp.tsx, enable `"strict": true` in frontend and resolve all TS errors | M4 | PLANNED |
| 6 | UI aesthetics & Mobile Responsiveness | Optimize design system Tailwind variables, refine responsiveness down to 375px, and add micro-animations | M5 | PLANNED |
| 7 | Full Verification & Hardening | Run the complete automated test suite (Vitest + Playwright + API), resolve all issues, and run Forensic Audit | M4, M5, M6 | IN_PROGRESS |

## Interface Contracts
### Auth Endpoints
- `/api/auth/test-login` (`POST`): Bypasses Turnstile CAPTCHA and logs in a pre-seeded guest account for integration testing. Returns `{ success: true, user: User, token: string }`.
- `/api/auth/login` (`POST`): Standard login, takes `{ username, password, turnstileToken }`.

### Chat Endpoint
- `/api/chat` (`POST`): Processes chat message stream. Takes `{ messages, stream, sessionId, profile, facialEmotion, model }`. Returns SSE stream or JSON.

### Survey Endpoints
- `/api/survey/submit` (`POST`): Submits survey answers. Takes `{ respondentId, openFeedback, answers... }`. Returns `{ success: true, id: string }`.

## Code Layout
- `web/src/App.tsx`: Coordination of login / chat screens.
- `web/src/AdminApp.tsx`: Monolithic admin dashboard. To be split.
- `web/src/components/chat/MessageBubble.tsx`: Message styling, contains dead code.
- `web/tsconfig.app.json`: Frontend tsconfig. Needs strict setting.
- `web/package.json`, `worker/package.json`: Need test frameworks added.
- `web/e2e/`: Directory for Playwright E2E tests.
- `scripts/api-verify.mjs`: Script to validate backend API endpoints.
