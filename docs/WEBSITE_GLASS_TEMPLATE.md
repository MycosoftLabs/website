# Mycosoft Website Glass Template

Updated: May 12, 2026

This is the approved visual direction for new Mycosoft website pages and new page-level feature sections.

## Rule

Do not restyle existing pages into this glass system unless Morgan explicitly requests it. For new pages and new major sections, use this as the default visual template.

## Core Treatment

- Use transparent glass panels and buttons so page backgrounds, video, canvas, or live animation remain visible.
- Buttons should use white text/icons on glass in both light and dark mode when placed over media or animated backgrounds.
- Cards should use low-opacity layered gradients, thin white borders, inner highlights, soft shadows, and backdrop blur.
- In dark mode, avoid solid dark card fills. Keep panels transparent enough that motion and imagery behind them remain visible.
- For live interfaces, inner elements such as logs, rows, messages, input bars, and status controls must also be glass-transparent. Do not leave opaque nested cards inside a transparent outer card.
- Use reduced-motion fallbacks for decorative animated light effects.

## Current Reference Implementations

- `app/ai/page.tsx`: glass hero buttons, themed stack cards, edge-only moving light on cards with varied speeds.
- `app/myca/page.tsx`: page-scoped glass treatment for buttons, cards, MYCA live demo panels, chat, activity log, inputs, and dark-mode overrides.
- `components/myca/LiveDemo.tsx`: explicit `myca-live-demo` and `myca-live-panel` hooks.
- `components/myca/MYCAChatWidget.tsx`: explicit chat shell, message, input, and confirmation panel hooks.
- `components/myca/MYCALiveActivityPanel.tsx`: explicit live activity card, activity log, and activity log row hooks.

## Implementation Notes

- Prefer page-scoped classes such as `.myca-page` or `.ai-glass-page` so glass overrides do not unexpectedly change unrelated pages.
- For nested product widgets, add semantic class hooks to the component instead of relying only on broad selectors.
- Use `!important` only where component library variants or theme classes otherwise override the glass template.
- Always verify both light and dark modes after adding glass styles.
