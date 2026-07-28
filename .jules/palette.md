## 2025-02-18 - Admin Dashboard Accessibility Improvements
**Learning:** Icon-only action buttons (like edit, save, delete) and inline inputs within data tables often lack sufficient context for screen reader users and can be difficult to navigate effectively via keyboard if focus indicators are missing or subtle.
**Action:** Always verify that interactive elements, especially icon-only buttons, have explicit `aria-label`s and clear `focus-visible` styles to enhance both screen reader support and keyboard accessibility.
## 2025-02-18 - Chat Interactive Elements Accessibility Polish
**Learning:** Animated, highly-styled UI components (like the `motion.div` emoji selector or rounded icon buttons in the input bar) often lack basic accessibility primitives out-of-the-box, specifically screen-reader context and keyboard focus states.
**Action:** When working with Framer Motion or heavily customized styled components, proactively add `aria-label` to abstract UI elements (like emojis) and enforce explicit `focus-visible:ring-2 focus-visible:ring-gemini-blue` classes on all interactive nodes to ensure standard keyboard navigation works.
## 2026-07-23 - Form Inputs and Dynamic Error Accessibility
**Learning:** Found a pattern across the app where form inputs (especially those using placeholders instead of visible labels) lack `aria-label`s, and dynamic error message containers lack `role="alert"`, making them invisible to screen readers when errors occur.
**Action:** Always ensure form inputs without explicit `<label>` elements have `aria-label`s, and any container that conditionally renders error messages includes `role="alert"` for proper screen reader announcement.
## 2026-07-26 - Consistent Localization in ARIA Labels
**Learning:** When adding ARIA labels to components that are mostly in one language (e.g., Chinese, like LoginModal.tsx), it's acceptable and often preferable to keep the ARIA labels in the same language for consistency unless otherwise specified by user requirements or accessibility guidelines specific to the primary user base.
**Action:** When adding ARIA labels, check the surrounding text context of the component to determine the appropriate language for the label.
## 2026-07-27 - Focus-visible styles on sidebar buttons
**Learning:** Icon-only action buttons in floating sidebars often miss keyboard focus styles. Adding `focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none` specifically targets keyboard navigation without impacting mouse users.
**Action:** Always check interactive elements in overlay/sidebar components for explicit `focus-visible` states, especially destructive actions that benefit from semantic colors like `ring-error`.
