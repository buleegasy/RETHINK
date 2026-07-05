# E2E Test Infra: RE-THINK Layout Integrity Verification

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Embedded Camera | ORIGINAL_REQUEST and Parent Update | 5 | 5 | ✓ |
| 2 | Bottom-Up Chat Flow | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 3 | Edge-Aligned Header | ORIGINAL_REQUEST | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Playwright (Desktop Chrome with --use-fake-ui-for-media-stream and --use-fake-device-for-media-stream flags)
- Test case format: Playwright `.spec.ts` script in the `e2e/` folder
- Directory layout:
  - `e2e/layout_integrity.spec.ts` (main E2E layout test file)
  - `e2e/journey.spec.ts` (existing guest user journey)

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Onboarding, Face Emotion Capture, and AI Delivery Flow | Embedded Camera, Chat Flow, Header | High |
| 2 | Manual Scroll Back-off Override | Chat Flow | Medium |
| 3 | Transition to Crisis Intervention Layout Shift | Embedded Camera, Chat Flow, Header | High |

## Coverage Thresholds
- Tier 1: 5 tests per feature (Total: 15 tests)
- Tier 2: 5 tests per feature (Total: 15 tests)
- Tier 3: Pairwise coverage of major feature interactions (Total: 5 tests)
- Tier 4: Real-world user journeys (Total: 3 tests)
