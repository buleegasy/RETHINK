# Progress Log

## Status: Completed
- **Last visited**: 2026-07-08T10:02:00+08:00

## Done
1. **Desktop Header & Sidebar Toggle**: Restored desktop header and sidebar toggle button structure, fully compatible with layout_verification.test.tsx and layout_integrity.spec.ts E2E tests.
2. **AmbientGlow Tests**: Updated `AmbientGlow.test.tsx` to assert new semantic CSS variables and correct opacity transitions (0.5 and 0.7).
3. **MessageBubble Tests**: Updated `MessageBubble.test.tsx` to assert new `backdrop-blur-md` and `backdrop-blur-[24px]` classes.
4. **Onboarding Welcome Panel**: Wrapped onboarding welcome container inside `ChatPanel.tsx` with classes `flex-1 flex flex-col justify-center w-full h-full`.
5. **Max-Width Alignment**: Unified max-widths of ChatPanel and InputBar to `max-w-3xl`. Updated matching query selector in unit tests.
6. **InputBar Border Radius**: Added dynamic border radius transition on InputBar container (`rounded-3xl` when multi-line text is inputted).
7. **Textarea Height Shrink Bug**: Patched height fallback hook in `InputBar.tsx` to always reset textarea height to `'auto'` before measuring `scrollHeight`.
8. **Mobile Header Transparency**: Added background transparency and backdrop blur (`bg-surface-dim/80 backdrop-blur-md`) to the mobile header in `App.tsx`.
9. **Camera Resource Leak on Mobile**: Wrapped the `CameraPanel` inside `SessionSidebar.tsx` in a conditional check `{isOpen && <CameraPanel ... />}` so that the camera stream unmounts when closed.
10. **Desktop Sidebar Toggle / State Sync**: Synced the collapsible layout states of the sidebar for desktop viewports using CSS transition class attributes (`transition-all`). Prevented desktop new-chat clicks from closing the sidebar.
11. **Typographic Configuration Bug**: Fixed typographic config in `tailwind.config.js` to map `serif` font stack to `Playfair Display`.
12. **EmojiSelector Scroll Overflow**: Removed the strict `min-h-[75vh]` layout constraint on mobile viewports for `EmojiSelector.tsx`.
13. **Small Font Accessibility**: Updated `CameraPanel` small text "本地检测" to `text-[10px]` and `font-normal`.
14. **Test Assertions**: Updated Playwright E2E spec selectors to handle persistent desktop sidebar by default, space-independent emotion label matching, and targeted main chat container selector.
15. **Unit Verification**: Ran `npm run test:unit` successfully (all 25 tests pass).
16. **Build Verification**: Ran `npm run build` successfully.
17. **E2E Playwright Verification**: Ran `npm run test:e2e` successfully (all 16 tests pass).
