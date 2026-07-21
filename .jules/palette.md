## 2025-02-18 - Admin Dashboard Accessibility Improvements
**Learning:** Icon-only action buttons (like edit, save, delete) and inline inputs within data tables often lack sufficient context for screen reader users and can be difficult to navigate effectively via keyboard if focus indicators are missing or subtle.
**Action:** Always verify that interactive elements, especially icon-only buttons, have explicit `aria-label`s and clear `focus-visible` styles to enhance both screen reader support and keyboard accessibility.
