## 2025-02-14 - Fix Authorization Bypass via Mock Tokens
**Vulnerability:** A critical authorization bypass vulnerability existed in the JWT token verification logic (`worker/src/lib/auth-utils.ts`). The condition `if (apiKey === 'mock_firebase_key_for_testing' || token.startsWith('mock-token-'))` allowed any request providing a token starting with `mock-token-` to bypass actual signature verification, regardless of the environment's `FIREBASE_API_KEY` configuration.
**Learning:** The use of `||` (OR) instead of `&&` (AND) in authentication bypass conditions for local development environments can expose production systems to trivial bypass attacks if the condition evaluates user-controlled input independently of environment constraints.
**Prevention:** Always use `&&` when combining an environment check (e.g., development/mock flag) with a user-input check (e.g., mock token format). Ensure that "backdoors" meant for testing are strictly gated by non-production configuration values.

## 2024-03-24 - [Hardcoded Secrets in Wrangler Config]
**Vulnerability:** Found `TURNSTILE_SECRET_KEY` and `ADMIN_SECRET_TOKEN` hardcoded in `worker/wrangler.toml` under the `[vars]` block, exposing them to anyone with source control access.
**Learning:** Cloudflare Workers secrets should never be placed in `wrangler.toml` `[vars]`. The `[vars]` block is for non-sensitive environment variables only.
**Prevention:** Always use `wrangler secret put <NAME>` for production secrets and `worker/.dev.vars` for local development secrets to ensure sensitive keys are not tracked in Git.

## 2025-02-14 - Missing Authentication on Survey Results Endpoint Exposing PII
**Vulnerability:** The `/api/survey/results` endpoint (`worker/src/routes/survey.ts`) was completely unauthenticated. This allowed anyone to access the survey results, which include sensitive PII data like users' locations, demographics, and mental health feedback.
**Learning:** Endpoints returning sensitive information or administrative views should never be publicly accessible and must require explicit authentication or authorization, even in early project stages.
**Prevention:** Always verify that internal, administrative, or sensitive data endpoints are protected by an authentication check (e.g., verifying an `x-admin-token` or checking user roles) before querying and returning data.

## 2026-07-22 - Missing Input Length Limits Exposing DoS Risk
**Vulnerability:** The survey submission endpoint `/api/survey/submit` (`worker/src/routes/survey.ts`) did not validate the length of user-provided fields (like `openFeedback`) or the overall JSON payload before writing to the D1 database.
**Learning:** Failing to enforce payload length boundaries in unauthenticated or lightly authenticated routes makes the system highly susceptible to Denial of Service (DoS) and database exhaustion attacks.
**Prevention:** Always enforce strict size limits on external inputs, particularly for endpoints that accept free-form text or JSON objects, using both field-level checks (e.g., `val.length > 5000`) and overall payload checks.
## 2026-06-06 - [Sentinel: Input Type and Length Validation]
**Vulnerability:** Authentication endpoints lacked strict type checking and length limits on input parameters (username, password, invitationCode, sessionId).
**Learning:** Omitted type checks () can lead to type juggling vulnerabilities, and missing length limits expose the application to DoS attacks through excessively large payloads, particularly on computationally expensive operations like password hashing or database inserts.
**Prevention:** Always enforce strict input validation, including explicit type checking and sensible maximum length constraints, on all user-provided data at the API boundary.
## 2026-06-06 - [Sentinel: Input Type and Length Validation]
**Vulnerability:** Authentication endpoints lacked strict type checking and length limits on input parameters (username, password, invitationCode, sessionId).
**Learning:** Omitted type checks (`typeof === 'string'`) can lead to type juggling vulnerabilities, and missing length limits expose the application to DoS attacks through excessively large payloads, particularly on computationally expensive operations like password hashing or database inserts.
**Prevention:** Always enforce strict input validation, including explicit type checking and sensible maximum length constraints, on all user-provided data at the API boundary.

## 2026-07-28 - Secure Knowledge API Endpoints
**Vulnerability:** The `/api/knowledge` endpoints (ingest, list, delete, query) lacked authentication, allowing unauthorized users to modify or query the system's knowledgebase.
**Learning:** Administrative endpoints must always require authorization. The existing pattern of using an `x-admin-token` header checked against `c.env.ADMIN_SECRET_TOKEN` was missing from the knowledge router.
**Prevention:** Apply consistent authentication middleware across all admin-level route groups (e.g., using `knowledgeRouter.use('*', ...)`) and ensure any companion scripts (like `ingest_jsonl.py`) are updated to send the required token.

## 2026-08-01 - Prevent Token Exhaustion DoS on LLM Endpoints
**Vulnerability:** The unauthenticated `/api/onboarding/analyze` endpoint directly passed user-provided text to an LLM completion request without any length or type constraints.
**Learning:** Endpoints proxying requests directly to LLMs without validation expose the application to severe financial and operational Denial of Service (DoS) attacks via excessive token consumption, even if the payload doesn't crash the database.
**Prevention:** Always enforce strict input type checking (`typeof input === 'string'`) and a reasonable maximum length constraint (`input.length > MAX_LEN`) *before* invoking any downstream AI models on unauthenticated or lightly authenticated routes.
## 2024-05-25 - [Fix timing attack vulnerability in admin token verification]
**Vulnerability:** Timing attack vulnerability in admin token verification across multiple routes (`admin.ts`, `ingest.ts`, `survey.ts`) due to the use of direct string comparison (`!==`).
**Learning:** Direct string comparisons evaluate character by character and return `false` early if characters don't match, which leaks information about the time it takes to process. This could allow an attacker to guess the `ADMIN_SECRET_TOKEN` character by character.
**Prevention:** Always use constant-time string comparison functions, such as a custom `timingSafeEqual` leveraging a bitwise XOR loop, to prevent timing attacks when comparing sensitive secrets.
