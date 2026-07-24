# Project: RE-THINK Agent 5-Round Full-Stack Code Optimization

## Architecture
RE-THINK Agent is a psychotherapeutic safety sanctuary comprised of a React + Vite + Tailwind frontend (`web`) and a Cloudflare Worker backend (`worker`).
- **Frontend (`web`)**: React 18/19, Vite, Tailwind CSS, Zustand state management.
- **Backend (`worker`)**: Cloudflare Worker using Hono, D1 database, Vectorize embeddings, SSE streaming.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Round 1 Optimization | Code Exploration & Full-Stack Baseline Analysis & Initial Fixes | None | DONE |
| 2 | Round 2 Optimization | Web Workspace Refactoring (Component structure, UI performance, Zustand store optimization) | M1 | DONE |
| 3 | Round 3 Optimization | Worker Workspace Refactoring (API middleware, error boundaries, Hono route handlers, payload safety) | M2 | DONE |
| 4 | Round 4 Optimization | Full-Stack Type Safety, Linting, & Dead Code Elimination | M3 | DONE |
| 5 | Round 5 Optimization | Bundle Size Optimization, UX Polish, & Final Edge-Case Resilience | M4 | DONE |
| 6 | Deliverable & Build Verification | Verify `optimization_log.md`, full build checks (`web` & `worker`), & Forensic Audit | M5 | DONE |

## Interface Contracts
### Auth Endpoints
- `/api/auth/test-login` (`POST`): Bypasses Turnstile CAPTCHA and logs in a pre-seeded guest account for integration testing. Returns `{ success: true, user: User, token: string }`.
- `/api/auth/login` (`POST`): Standard login, takes `{ username, password, turnstileToken }`.

### Chat Endpoint
- `/api/chat` (`POST`): Processes chat message stream. Takes `{ messages, stream, sessionId, profile, facialEmotion, model }`. Returns SSE stream or JSON.

### Survey Endpoints
- `/api/survey/submit` (`POST`): Submits survey answers. Takes `{ respondentId, openFeedback, answers... }`. Returns `{ success: true, id: string }`.

## Code Layout
- `web/src/`: React UI, components, hooks, stores.
- `worker/src/`: Cloudflare Worker API handlers, routes, services, DB bindings.
- `optimization_log.md`: Log of all 5 optimization rounds at project root.
