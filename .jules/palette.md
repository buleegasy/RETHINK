## 2025-02-18 - Admin Dashboard Accessibility Improvements
**Learning:** Icon-only action buttons (like edit, save, delete) and inline inputs within data tables often lack sufficient context for screen reader users and can be difficult to navigate effectively via keyboard if focus indicators are missing or subtle.
**Action:** Always verify that interactive elements, especially icon-only buttons, have explicit `aria-label`s and clear `focus-visible` styles to enhance both screen reader support and keyboard accessibility.
## 2025-02-18 - Chat Interactive Elements Accessibility Polish
**Learning:** Animated, highly-styled UI components (like the `motion.div` emoji selector or rounded icon buttons in the input bar) often lack basic accessibility primitives out-of-the-box, specifically screen-reader context and keyboard focus states.
**Action:** When working with Framer Motion or heavily customized styled components, proactively add `aria-label` to abstract UI elements (like emojis) and enforce explicit `focus-visible:ring-2 focus-visible:ring-gemini-blue` classes on all interactive nodes to ensure standard keyboard navigation works.
