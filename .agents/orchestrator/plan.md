# plan.md — 2026-06-19T19:33:00+08:00

## Objectives
1. **Resolve Compilation Error**: Fix the esbuild tag mismatch in `web/src/App.tsx` (unmatched closing `motion.div` tag).
2. **Resolve Agent Test Failure**: Add `riskLevel`, `ragQueried`, and `ragRetrievalMode` to the early-return payload in `worker/src/routes/chat.ts` for crisis escalation.
3. **Verify All Test Suites**: Ensure TypeScript compilation, Vitest unit tests, Playwright E2E tests, API tests, and Agent smoke tests pass cleanly.
4. **Integrity Validation**: Run the Forensic Auditor to confirm clean implementation status.

## Remaining Milestones

### Milestone 7: Integration and Final Gating (Bugfix, Verification & Auditing)
- **Deliverables**:
  - Spawn worker to fix `web/src/App.tsx` tag mismatch and `worker/src/routes/chat.ts` crisis early-return schema omission.
  - Spawn challenger to execute all verification commands:
    - `npm run build` & `npx tsc --noEmit` in `web/`
    - `npm run test:unit` (Vitest unit/component tests)
    - `npm run test:e2e` (Playwright E2E tests)
    - `npm run test:api` (API validation checks)
    - `npm run test:agent` (Agent smoke tests)
  - Spawn forensic auditor to verify implementation integrity and publish a final report.
- **Verification**: Complete passing run of all test commands and a CLEAN auditor verdict.
