## Current Status
Last visited: 2026-06-24T21:16:00+08:00
- [x] Explore UI components and establish detailed refactoring plans (done)
- [x] Refactor InputBar.tsx, SessionSidebar.tsx, and CrisisOverlay.tsx (done)
- [x] Review code styling and run build checks (done, findings gathered)
- [x] Remediation: Fix p-4.5 padding, scroll cutoff on short viewports, non-logical properties in CameraPanel, guest login error mock, unused imports, and update E2E tests (done)
- [x] Verification: Run static analysis, build compilation, and E2E checks (done)
- [x] Run Forensic Auditor (done)

## Iteration Status
Current iteration: 2 / 32
Spawn count: 15 / 16

## Retrospective Notes
- **REMEMBER**: Spacing classes in Tailwind (like `p-4.5`) are ignored if not extended in the theme config. Always verify layout rules against the custom Tailwind configuration.
- **Scroll container flex centering warning**: Using `flex items-center justify-center` with `overflow-y-auto` clips content on small viewports. Use `justify-start sm:justify-center` or add vertical paddings to ensure scroll accessibility.
- **E2E Selector Synchronicity**: UI revisions (like removing intermediate entry screens) must be propagated to E2E spec files to prevent broken workflows.
- **ESLint Cleanliness**: Unused imports/variables from deprecated segments must be cleaned up to pass strict monorepo lint gates.
