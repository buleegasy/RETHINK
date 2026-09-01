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

## 2024-05-30 - Sidebar Accessibility Focus States
**Learning:** React Motion (`motion.button`) elements in the `SessionSidebar` were stripping or missing default keyboard focus rings, making it impossible for keyboard users to track tab order through critical actions like new chat, refresh, and logout.
**Action:** Always verify that interactive elements, especially custom motion components, have explicit `focus-visible:ring-2 focus-visible:outline-none` classes added to ensure keyboard accessibility.
## 2026-07-29 - Login Modal Form Field Labels
**Learning:** Placeholders and `aria-label`s on standard HTML text/password inputs often do not provide sufficient context for all screen readers across different devices and browsers. Explicit, semantically linked `<label>` tags provide the most robust accessibility.
**Action:** Always link text and password inputs with an explicit `<label>` tag using the `id` and `htmlFor` attributes. If visual aesthetics demand no label, apply a `sr-only` class to visually hide the label while maintaining semantic availability.
## 2025-02-18 - Admin Login Accessibility Improvements
**Learning:** The AdminLogin component had an input without a semantic label, relying only on `aria-label`, and the submit button lacked keyboard focus styles, making it harder to use for keyboard-only users.
**Action:** Always link text/password inputs with an explicit `<label>` tag using `id` and `htmlFor`, even if visually hidden with `sr-only`. Also, ensure primary action buttons have explicit `focus-visible` utility classes (like `focus-visible:ring-2 focus-visible:ring-white`) for clear keyboard navigation states.

## 2026-08-03 - [Native Dialogs in Visual Verification]
**Learning:** Native OS-level dialogs like `window.confirm` cannot be captured by standard Playwright `page.screenshot()`. Relying on visual screenshots to verify their presence will fail.
**Action:** Use programmatic interception like `page.on('dialog')` in testing scripts to verify their invocation, rather than expecting them to appear in the generated screenshots.
## 2024-05-20 - [ARIA Label Overriding Visible Text]
**Learning:** When enhancing accessibility on buttons containing critical visible text (like dynamic names or scores), adding an `aria-label` completely overrides the child elements' visible text for screen readers. Screen readers will only read the `aria-label` and ignore the text content within the button.
**Action:** Avoid using `aria-label` to indicate state (like expanded/collapsed) when the button contains important visible text. Rely on attributes like `aria-expanded` which screen readers will read in addition to the element's text.
## 2025-03-06 - Login Modal Tab Accessibility
**Learning:** When using visually styled elements (like toggle buttons) to create a custom tabbed interface, it is crucial to manually apply `role="tablist"` to the parent container and `role="tab"` along with a dynamically bound `aria-selected` boolean to the individual toggle buttons. This prevents screen readers from treating them as disjointed generic buttons and provides accurate contextual state.
**Action:** Always verify custom switch/toggle interfaces to ensure they contain semantic ARIA mapping corresponding to standard disclosure or tab widget specs.
## 2024-08-20 - Adding aria-hidden to decorative SVGs
**Learning:** When buttons contain text or an explicit `aria-label`, any SVG icons inside them should be marked with `aria-hidden="true"` to prevent screen readers from redundantly announcing the graphic or becoming confused by inline SVG properties.
**Action:** Always verify if SVG elements inside semantic interactive controls need `aria-hidden="true"` during UI/accessibility polish passes.
