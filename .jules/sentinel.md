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
