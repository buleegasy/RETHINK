# E2E Test Infra: RE-THINK Pre-Info Collection

## Test Philosophy
- Requirement-driven, opaque-box and API-level verification.
- Methodology: BVA + Category-Partition + Scenario Testing.
- Strict validation of state transitions (`Pre_Info_Collection` -> `Active_Listening`) and user name context injection.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 (Unit/API) | Tier 2 (Boundary) | Tier 3 (Integration) | Tier 4 (Real-World E2E) |
|---|---------|----------------------|:-----------------:|:-----------------:|:--------------------:|:-----------------------:|
| 1 | Receptionist Greeting on Chat Start | R1 / Acceptance Criteria 1 | ✓ | ✓ | ✓ | ✓ |
| 2 | Conversational User Name Collection | R1 / Acceptance Criteria 2 | ✓ | ✓ | ✓ | ✓ |
| 3 | State Transition to Formal Counseling | R2 / Acceptance Criteria 2 | ✓ | ✓ | ✓ | ✓ |
| 4 | User Name Address in Formal Counseling | R2 / Acceptance Criteria 3 | ✓ | ✓ | ✓ | ✓ |
| 5 | Refusal / Fallback / Crisis Edge Cases | R1 / Edge Cases | ✓ | ✓ | ✓ | ✓ |

## Test Architecture
- **Worker Unit Tests**: `worker/src/test/fsm.test.ts` (Vitest)
- **Frontend Store/Component Tests**: `web/src/store/chatStore.test.ts` (Vitest + JSDOM)
- **Automated Verification Script**: `node scripts/pre-info-verify.mjs` (Smoke & multi-turn API test)
- **E2E Integration Test**: `web/e2e/receptionist-flow.spec.ts` (Playwright)

## Coverage Thresholds
- Tier 1: 100% of FSM states (`Pre_Info_Collection`, `Active_Listening`, `Crisis_Escalation`) tested in unit tests.
- Tier 2: Boundary test cases for empty name, refusal ("保密"), name in long sentence, and early crisis trigger.
- Tier 3: API multi-turn smoke test script verifying full JSON stream & SSE chunk outputs.
- Tier 4: E2E Playwright test simulating real user flow from welcome screen to formal counseling.
