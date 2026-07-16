## 2023-10-27 - InputBar Accessibility Improvements
**Learning:** Found that the custom input bar (`web/src/components/chat/InputBar.tsx`) used icon-only buttons that were only accessible via mouse hover, with no `title` attributes for tooltips or focus rings for keyboard navigation. Disabled states lacked context.
**Action:** Always add `title` and `focus-visible` classes to interactive elements, especially icon-only buttons, to ensure tooltip context and keyboard accessibility.
