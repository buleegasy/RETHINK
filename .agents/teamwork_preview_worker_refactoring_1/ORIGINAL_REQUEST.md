## 2026-06-19T12:31:07+08:00
You are the Code Refactoring Specialist (worker_refactoring_1).
Your working directory is `/Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_worker_refactoring_1/`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to resolve architectural tech debt and enforce strict TypeScript typings (Milestone 5):
1. Dead Code & File Removal:
   - Delete the unused files: `web/src/components/layout/StageIndicator.tsx` and `web/src/components/layout/SunlightBackground.tsx`.
   - Clean up `web/src/components/chat/OnboardingOverlay.tsx` (ensure it does not cause any compiler issues or contains dead code).
   - In `web/src/components/chat/MessageBubble.tsx`, remove all dead code: unused imported icons (from lucide-react), unused lookup tables (like INTENT_LABEL, EMOTION_LABEL, RISK_LABEL, etc.), unused helpers (like fsmLabel, safeArray, scoreTone), unused internal components (like AuditSection, AuditRow, AuditBadge), and unused state hooks/variables (like showTechChain, expandedRag, and unused destructured variables from techChain).
2. Modularize Admin View:
   - Refactor the monolithic `web/src/AdminApp.tsx` (approx 396 lines) by splitting it into reusable, decoupled sub-components (e.g. create a `web/src/components/admin/` folder containing `AdminLogin.tsx` and `AdminDashboard.tsx`, or similar structure) and importing them back into `AdminApp.tsx` (or whatever fits the app routes best). Keep it clean, maintainable, and fully functional.
3. Strict TypeScript Compiling & Type Bypasses:
   - Edit `web/tsconfig.app.json` (and `web/tsconfig.json` or other frontend config files if needed) to enable `"strict": true`.
   - Run compilation checks (`npx tsc --noEmit` or similar build command in the `web` workspace) and resolve ALL resulting compilation errors. Ensure no errors remain.
   - Replace the `as any` type bypasses across the frontend, including:
     - `MessageBubble.tsx`: `const tc = message.techChain as any;`
     - `hooks/useChat.ts`: `setLastMessageTechChain(techChain as any);`
     - `hooks/useFaceEmotion.ts`: `(window as any).faceapi`
     Define clean TypeScript interfaces (e.g., proper interfaces for message metadata and techChain structure in `web/src/types/index.ts` or co-located types) and use them.

Scope Boundaries:
- Do not make major visual styling changes. The focus is strictly on refactoring, dead code cleanup, component modularization, and TypeScript type-safety.
- Run builds and tests to ensure no functionality is broken by the refactoring.

Input:
- Root path: `/Users/chenhaoran/Documents/心理竞赛`
- Codebase files in `web/` workspace.
- Detailed audit reports in `/Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_explorer_analysis_2/analysis.md` and `handoff.md`.

Output requirements:
- Write a detailed implementation report to `/Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_worker_refactoring_1/changes.md`.
- Write your handoff report to `/Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_worker_refactoring_1/handoff.md` demonstrating that compilation (`npx tsc --noEmit`) passes with zero errors and that existing unit tests still pass.
- Send a message back to the orchestrator (conversation ID 983dda6f-69b5-465a-8523-c951dc5a6a7d) when done.

Completion criteria:
- TypeScript compilation (`npx tsc --noEmit`) passes with zero errors on the frontend.
- Dead files/code removed and AdminApp.tsx split into clean files.
- All tests (including Vitest unit tests) pass.
