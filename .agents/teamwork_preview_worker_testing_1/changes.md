# Progress / Implementation Report — Testing Infrastructure

## Changes Made

### 1. Package Configuration Updates
- **`web/package.json`**:
  - Added scripts:
    - `"test:unit": "vitest run"` (Runs unit tests using Vitest)
    - `"test:e2e": "playwright test"` (Runs E2E UI tests using Playwright)
  - Added devDependencies:
    - `vitest`: `^2.1.8`
    - `@playwright/test`: `^1.49.1`
    - `@testing-library/react`: `^16.2.0`
    - `@testing-library/dom`: `^10.4.0`
    - `@testing-library/jest-dom`: `^6.6.3`
    - `jsdom`: `^25.0.1`
    - `@rollup/rollup-darwin-arm64`: For compatibility on macOS Apple Silicon.
- **Root `package.json`**:
  - Added convenient delegate scripts:
    - `"test:unit": "npm run test:unit --workspace=web"`
    - `"test:e2e": "npm run test:e2e --workspace=web"`
    - `"test:api": "node scripts/api-verify.mjs"`

### 2. Unit/Component Test Suite
- **`web/vitest.config.ts`**: Created Vitest configuration file matching standard React + Vite settings with `jsdom` test environment.
- **`web/src/test/setup.ts`**: Configured global imports for `@testing-library/jest-dom` matchers.
- **`web/src/components/chat/MessageBubble.test.tsx`**: Created unit tests for the Chat Message Bubble asserting:
  - Proper mounting of user message content.
  - Parsing and rendering of markdown styling (bold/italic) inside the assistant message bubble.
  - Return of null (rendering nothing) when `isHidden` is set on the message object.

### 3. E2E UI Test Suite
- **`web/playwright.config.ts`**: Created Playwright config targeting the system's Google Chrome channel (to bypass external binary download restrictions in offline mode) with headless mode set by default.
- **`web/e2e/journey.spec.ts`**: Established user journey flow asserting:
  - Visited landing page successfully.
  - Clicked the "Enter" orb.
  - Pre-injected a mock Cloudflare Turnstile API to prevent offline hangs on siteverify script loader.
  - Mocked `/api/auth/test-login` and `/api/auth/bind-session` endpoint responses using Playwright routing.
  - Clicked "Guest Access" and verified successful transition into sanctuary view (by asserting presence of greeting header `"你好，欢迎来到这里"` and the `"开始对话"` button).

### 4. API Verification Script
- **`scripts/api-verify.mjs`**: Created Node verification script that fetches and validates two backend routes:
  - `POST /api/auth/test-login` with `{}` body (resolving Turnstile bypass to verify guest token generation).
  - `GET /api/auth/sessions` with `Authorization: Bearer <token>` to verify session listing.
  - Exit code is `0` on success and `1` on failure.

---

## Verification Summary

### Unit Tests
- Command: `npm run test:unit`
- Status: **PASSED**
- Result: 3/3 tests passed.

### E2E Tests
- Command: `npm run test:e2e`
- Status: **PASSED**
- Result: 1/1 user journey spec passed.

### API Tests
- Command: `npm run test:api`
- Status: **PASSED**
- Result: Endpoint 1 and Endpoint 2 verified successfully against local Wrangler dev server.

### Linting
- Command: `npx eslint web/src/components/chat/MessageBubble.test.tsx web/e2e/journey.spec.ts web/vitest.config.ts web/src/test/setup.ts`
- Status: **PASSED**
- Result: 0 violations.
