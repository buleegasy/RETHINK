# Project: RETHINK Landing Page and LoginWall Refactoring

## Architecture
RETHINK is a digital art & psychological safety sanctuary built on React, Vite, and Tailwind CSS.
- **State Management**: Zustand stores manage authentication state (`useAuthStore`) and chat states (`useChatStore`).
- **Core Views**:
  1. **Landing/Login View (`LoginWall`)**: Displayed to unauthenticated users. Features a museum-like minimalist layout, an entry orb, and a Turnstile-protected modal.
  2. **Sanctuary Chat View (`ChatPanel`)**: Displayed only to authenticated users. Facilitates chat-based psychological safety with FSM-based conversational flows.
- **Data Flow**:
  - The authentication status determines the active route/view dynamically, ensuring no component overlapping or memory leakages between screens.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Layout Restructuring | Conditionally render ChatPanel vs LoginWall based on `isAuthenticated` in `App.tsx` | None | DONE |
| 2 | Premium Animation | Implement premium animations (e.g. `DecryptText`, `BlurText`) and apply to title/subtitle in `LoginWall` | M1 | DONE |
| 3 | Code Verification | Run compilation, verification scripts, and check for layout overlaps | M2 | DONE |
| 4 | UI Refactoring & Localization | Fix UI overlap, remove AmbientGlow, replace text buttons with icons, localize to Chinese | M3 | DONE |
| 5 | Verification & Audit | Verify build, run Vitest and Playwright tests, run Forensic Auditor | M4 | DONE |

## Interface Contracts
### App ↔ LoginWall
- `isAuthenticated` state controls visible UI.
- When `isAuthenticated` is `false`, the main workspace container must not be mounted or active in the DOM to avoid tab-focus leaks or pointer overlaps.
- Core authentication actions in `useAuthStore` (login, logout) must remain completely unaffected.

## Code Layout
- `web/src/App.tsx`: Root component coordinating views and states.
- `web/src/components/auth/LoginWall.tsx`: Renders the landing screen text and entry trigger.
- `web/src/components/auth/LoginModal.tsx`: Renders the registration/login form and handles token verification.
- `web/src/components/ui/`: New directory housing `BlurText.tsx` and `DecryptText.tsx` reusable premium animation components.
