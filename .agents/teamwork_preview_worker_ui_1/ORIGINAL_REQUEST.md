## 2026-07-08T01:38:51Z
You are teamwork_preview_worker, working on Milestone 2: UI Alignment Fixes for the project "RE-THINK Chat Interface Layout Polish".
Your working directory is: /Users/chenhaoran/工程文件/心理大赛/.agents/teamwork_preview_worker_ui_1
Your workspace directory is: /Users/chenhaoran/工程文件/心理大赛

Your task is to implement the UI layout polishing and test alignment fixes based on the aggregated findings from our investigation.

### Input Information
Please read the synthesis report at:
`/Users/chenhaoran/工程文件/心理大赛/.agents/teamwork_preview_orchestrator_layout_polish/synthesis.md`

### Specific Fix Requirements
1. **Desktop Header & Sidebar Toggle**:
   - Restore the desktop header `div.absolute.top-0.left-0` container and sidebar toggle `button[aria-label="历史对话"]` in `web/src/App.tsx`. Make sure it satisfies the unit test expectations in `web/src/test/layout_verification.test.tsx` and E2E test `T1-1` in `web/e2e/layout_integrity.spec.ts` while remaining clean and visually integrated with the persistent sidebar design.
2. **AmbientGlow & MessageBubble Tests**:
   - Update `web/src/components/layout/AmbientGlow.test.tsx` to assert the new styling (semantic CSS variables like `var(--aura-calm-1)`, and opacities `0.5`/`0.7` instead of `0.35`/`0.55`).
   - Update `web/src/components/chat/MessageBubble.test.tsx` to assert the new styling (`backdrop-blur-md` and `backdrop-blur-[24px]` classes).
3. **Onboarding Welcome Panel**:
   - In `web/src/components/chat/ChatPanel.tsx`, ensure the welcome motion container wraps `GeminiWelcome` with `flex-1 flex flex-col justify-center w-full h-full` so it is vertically centered in the viewport.
4. **Max-Width Alignment**:
   - Unify the maximum widths between `ChatPanel.tsx` (currently `max-w-[800px]`) and `InputBar.tsx` (currently `max-w-3xl`/768px). Standardize them to a consistent max-width (e.g. `max-w-3xl` or `max-w-[800px]`) so they align vertically. Update any corresponding assertions in `web/src/test/layout_verification.test.tsx` (e.g. if the test queries `.max-w-2xl`, update it to the unified max-width).
5. **InputBar Border Radius**:
   - Update the text input container in `web/src/components/chat/InputBar.tsx` to transition gracefully or use a uniform `rounded-3xl` instead of a strict `rounded-full` when expanded to multiple lines, preventing visual distortion.
6. **Textarea Height Shrink Bug**:
   - In `web/src/components/chat/InputBar.tsx`, patch the JS resize fallback hook so it always resets the textarea height to `'auto'` before measuring `scrollHeight` on value change, ensuring it shrinks correctly when text is replaced by a shorter block.

### Verification Criteria
- Run `npm run test:unit` in `web/` to make sure all unit tests pass successfully.
- Run `npm run build` in `web/` to ensure the project builds without TypeScript or bundler errors.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please document all files changed in a report and notify me when you are done. Keep your liveness heartbeat updated in `progress.md` in your working directory.

## 2026-07-08T01:42:29Z
We have received the findings from another Explorer subagent (Explorer 1) which identifies additional visual and layout polish items, resource leaks, and test regressions that must be addressed alongside the previous findings. 

Here is the summary of the additional items:
1. **Mobile Header Transparency**: Add background color and backdrop blur (e.g., `bg-surface-dim/80 backdrop-blur-md` or `bg-surface/90 backdrop-blur-md`) to the mobile header in `App.tsx` (around line 94) to prevent scrolled messages from overlapping readability.
2. **Camera Resource Leak on Mobile**: In `SessionSidebar.tsx`, wrap the `<CameraPanel />` rendering in a conditional check (e.g., dynamic viewport width check or sidebar open status) so that the camera stream unmounts completely when the sidebar is closed on mobile, resolving privacy indicators and battery drain.
3. **Desktop Sidebar Toggle / State Sync**: Ensure the sidebar toggle state synced properly on desktop, or ensure that desktop actions like "New Chat" do not lead to a visual mismatch where the sidebar is logically closed but visually takes up 280px of space.
4. **Typographic Configuration Bug**: In `tailwind.config.js`, map the `serif` key to a proper serif font (e.g., `Playfair Display`) instead of the sans-serif font `Sora`.
5. **EmojiSelector Scroll Overflow**: In `EmojiSelector.tsx`, remove or reduce the strict `min-h-[75vh]` constraint on mobile viewports so that the emoji selector grid does not overflow the viewport and force vertical scrollbars during onboarding.
6. **Small Font Accessibility**: In `CameraPanel.tsx`, update the small "本地检测" text to be at least `text-[10px]` and `font-normal`/`font-medium` to comply with legibility criteria.
7. **Test Assertions**:
   - Update Playwright E2E spec selectors in `e2e/layout_integrity.spec.ts` to locate the real DOM toggle button (which uses `aria-label="打开侧边栏"` rather than `aria-label="历史对话"`), and adjust tests to handle desktop layout where sidebar is persistent by default.
   - Update any remaining unit tests that assert obsolete properties.

**Action**: Please incorporate these additional items into your layout fixes in Milestone 2. Let me know when you are done with the implementation and verification checks.
