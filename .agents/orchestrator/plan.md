# plan.md — 2026-06-24T20:55:00+08:00

## Objectives
1. **Explore UI Components**: Deeply analyze `InputBar.tsx`, `SessionSidebar.tsx`, `CrisisOverlay.tsx`, and `MessageBubble.tsx` to define the refactoring plan for aligning with the terminal-like 'Tech Chain' (后台推演) panel, Gemini MD3 standards, and modern web guidelines.
2. **Implement Refactoring**:
   - Apply MD3 semantic colors, corner radii logic (`rounded-[22px]` etc.), and background mappings.
   - Enforce typography: `font-mono` for technical/status data, `font-sans` for prose/messages.
   - Restrain visual elements: Remove inappropriate emojis, colloquial styling, and legacy or BEM-like classes.
   - Enhance aesthetics using modern web guidelines (logical properties, backdrop-blur, clean borders like `border-outline-variant/30`).
3. **Verify and Audit**: Run `npm run build --workspace=web`, check for regressions or visual overlaps, and run the Forensic Auditor for final verification.

## Milestone 1: Exploration & Analysis
- **Worker**: `teamwork_preview_explorer`
- **Deliverables**: Detailed recommendations on how to refactor `InputBar.tsx`, `SessionSidebar.tsx`, and `CrisisOverlay.tsx`.
- **Verification**: Explorer handoff report.

## Milestone 2: Implementation
- **Worker**: `teamwork_preview_worker`
- **Deliverables**: Code changes to `InputBar.tsx`, `SessionSidebar.tsx`, and `CrisisOverlay.tsx`.
- **Verification**: Code diff review.

## Milestone 3: Verification & Review
- **Worker**: `teamwork_preview_reviewer` + `teamwork_preview_challenger`
- **Deliverables**:
  - Reviewer: Confirms compliance with MD3 standards and typography rules.
  - Challenger: Executes `npm run build --workspace=web` and verifies successful compilation.
- **Verification**: Reports showing passing builds and clean styling.

## Milestone 4: Forensic Audit
- **Worker**: `teamwork_preview_auditor`
- **Deliverables**: Forensic audit report.
- **Verification**: CLEAN verdict.
