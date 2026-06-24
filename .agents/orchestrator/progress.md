## Current Status
Last visited: 2026-06-24T18:31:00+08:00
- [x] Explore codebase layout, backgrounds, and control buttons (done)
- [x] Refine PROJECT.md / plan.md for UI Refactoring (done)
- [x] Implementation: Fix UI Overlap, Clean Background, Icon-based Controls, and Localization (done)
- [x] Verification: Run typescript check, unit, E2E, and API tests (done)
- [x] Forensic Audit: Run integrity audit and confirm clean status (done)

## Iteration Status
Current iteration: 1 / 32
Spawn count: 7 / 16

## Retrospective Notes
### What Worked:
- **Clean Background Refactoring**: Removing `AmbientGlow` and applying solid `bg-surface-dim` backgrounds completely solved layout overlaps and background transparency leakages, providing a clean, aesthetic museum layout.
- **Icon-based Controls & Chinese Localization**: Replaced text buttons for menu (mobile) and history (desktop) with SVGs, and guest login with a user icon-only button containing Chinese ARIA/title attributes. All remaining English branding text (e.g. copyright) was localized to Chinese, removing any English/bracketed text.
- **E2E Selector Updates**: Upgraded Playwright E2E test selectors to target the new Chinese labels ("进入" and "访客体验" via aria-label) cleanly, ensuring the full pipeline test passed without modifications to the flow.

### Lessons Learned:
- Local network loopbacks on macOS can resolve `localhost` to IPv6 `::1` in Node.js fetching scripts. When verifying local API endpoints, using `127.0.0.1` explicitly prevents connection refusals.
