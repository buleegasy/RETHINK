# plan.md — 2026-06-24T18:22:00+08:00

## Objectives
1. **Explore current codebase**: Understand how backgrounds (`AmbientGlow`, `ArtMeshBackground`), login walls, chat input bars, text-heavy controls, and localization are implemented.
2. **Implement UI modifications**:
   - Fix UI Overlap: Mutually exclusive rendering between `LoginWall` and the main application container.
   - Clean backgrounds: Remove flowing/curved backgrounds, replacing with a minimalist aesthetic.
   - Restrained controls: Replace text-based `[MIC]`, `[HISTORY]`, `[SEND]`, and Guest Access buttons with minimalist icons.
   - Localization: Ensure all visible UI text in affected files is fully translated to Chinese.
3. **Verify and Audit**: Run existing unit, API, and E2E tests, and check with Forensic Auditor for zero-tolerance compliance.

## Milestone 1: Exploration and Analysis
- **Deliverables**: Handoff reports from Explorer agents identifying code locations, current rendering logic, and proposing exact changes.
- **Verification**: Analysis reports written by Explorer agents.

## Milestone 2: Implementation
- **Deliverables**: Code changes implemented by a Worker agent.
- **Verification**: Compiler and manual check by Reviewer agent.

## Milestone 3: Verification, Hardening, and Auditing
- **Deliverables**: Verification reports by Challenger agent running all tests, and clean audit verdict by Forensic Auditor.
- **Verification**: 100% tests passing, clean audit verdict.
