# Neuromorphic UI Test Page (Feb 18, 2026)

**Status:** Live test page only. Rollout to specific pages and apps will follow after validation.

## Purpose

- **Route:** `/ui/neuromorphic`
- **Component:** `components/ui/neuromorphic/NeuromorphicTestPage.tsx`
- **Styles:** `components/ui/neuromorphic/neuromorphic-styles.css` (scoped under `.neuromorphic-page`)

A full neuromorphic component library test page translated from the reference HTML into TypeScript and CSS. Use it to validate the design system before applying neuromorphic UI to specific pages and tools.

## Contents

- **Basics:** Buttons (default, primary, success, loading), toggles, checkbox, radio, badges, tooltips, accordion
- **Forms:** Text inputs (with validation), country search dropdown, multi-select, range slider, star rating, date/time, file upload
- **Feedback:** Progress bar (with shimmer), loading states (spinner, dots, skeleton), toasts (success/error/warning/info), modal, alert messages
- **Data:** Table with client-side search, bar chart, donut chart
- **Advanced:** Breadcrumbs, stepper, feature cards, context menu (right-click), tree view

## Accessibility

- Skip link, ARIA roles, keyboard navigation (tabs, accordion, modal focus trap), reduced-motion support, focus-visible styles.

## Integration

- Page: `app/ui/neuromorphic/page.tsx` (metadata + render of `NeuromorphicTestPage`).
- No mock data: demo content is static for the library showcase only.

## Next steps

After verification on `/ui/neuromorphic`, refine and add neuromorphic components to specific pages and apps as needed.
