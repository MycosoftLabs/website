"use client"

export function MYCALiveDemoGlassStyles() {
  return (
    <style>{`
      .myca-page button,
      .myca-page .neu-btn {
        position: relative;
        overflow: hidden;
        border-color: rgba(255, 255, 255, 0.36) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.11) 44%, rgba(255, 255, 255, 0.045)) !important;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.68);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.34),
          inset 0 -14px 28px rgba(255, 255, 255, 0.055),
          0 14px 34px rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(18px) saturate(1.22);
        -webkit-backdrop-filter: blur(18px) saturate(1.22);
      }

      .myca-page button::before,
      .myca-page .neu-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, rgba(255, 255, 255, 0.42), transparent 38%, rgba(255, 255, 255, 0.12) 68%, transparent);
        opacity: 0.48;
      }

      .myca-page button:hover,
      .myca-page .neu-btn:hover {
        border-color: rgba(255, 255, 255, 0.58) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.15) 44%, rgba(255, 255, 255, 0.065)) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.44),
          0 18px 42px rgba(0, 0, 0, 0.24);
      }

      .myca-page button svg,
      .myca-page .neu-btn svg {
        color: #fff !important;
        stroke: currentColor !important;
      }

      .myca-page [data-slot="card"],
      .myca-page .neu-raised:not(button) {
        border-color: rgba(255, 255, 255, 0.28) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.075) 46%, rgba(255, 255, 255, 0.035)),
          rgba(255, 255, 255, 0.08) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.24),
          inset 0 -18px 34px rgba(255, 255, 255, 0.04),
          0 18px 44px rgba(15, 23, 42, 0.14);
        backdrop-filter: blur(18px) saturate(1.18);
        -webkit-backdrop-filter: blur(18px) saturate(1.18);
      }

      .dark .myca-page [data-slot="card"],
      .dark .myca-page .neu-raised:not(button) {
        border-color: rgba(255, 255, 255, 0.24) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.055) 46%, rgba(255, 255, 255, 0.025)),
          rgba(2, 12, 10, 0.44) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.18),
          inset 0 -18px 34px rgba(255, 255, 255, 0.03),
          0 20px 48px rgba(0, 0, 0, 0.24);
      }

      .myca-page .myca-live-demo .myca-live-panel,
      .myca-page .myca-live-demo [data-slot="card"],
      .myca-page .myca-live-demo .neu-raised:not(button),
      .myca-page .myca-live-demo .myca-chat-shell,
      .myca-page .myca-live-demo .myca-live-activity-card,
      .myca-page .myca-live-demo [class*="bg-card"],
      .myca-page .myca-live-demo [class*="bg-muted"] {
        border-color: rgba(255, 255, 255, 0.26) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.024) 48%, rgba(255, 255, 255, 0.01)),
          rgba(255, 255, 255, 0.015) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.16),
          0 18px 44px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(6px) saturate(1.08);
        -webkit-backdrop-filter: blur(6px) saturate(1.08);
      }

      .dark .myca-page .myca-live-demo .myca-live-panel,
      .dark .myca-page .myca-live-demo [data-slot="card"],
      .dark .myca-page .myca-live-demo .neu-raised:not(button),
      .dark .myca-page .myca-live-demo .myca-chat-shell,
      .dark .myca-page .myca-live-demo .myca-live-activity-card,
      .dark .myca-page .myca-live-demo [class*="bg-card"],
      .dark .myca-page .myca-live-demo [class*="bg-muted"] {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02) 48%, rgba(255, 255, 255, 0.008)),
          rgba(0, 20, 14, 0.08) !important;
      }

      .myca-page .myca-live-demo [data-slot="tabs-list"][class*="bg-muted"] {
        border: 1px solid rgba(255, 255, 255, 0.24) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.018) 48%, rgba(255, 255, 255, 0.008)),
          rgba(255, 255, 255, 0.014) !important;
        background-color: rgba(255, 255, 255, 0.014) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.14),
          0 16px 38px rgba(0, 0, 0, 0.08) !important;
        backdrop-filter: blur(8px) saturate(1.08) !important;
        -webkit-backdrop-filter: blur(8px) saturate(1.08) !important;
      }

      html.dark .myca-page .myca-live-demo [data-slot="tabs-list"][class*="bg-muted"],
      .dark .myca-page .myca-live-demo [data-slot="tabs-list"][class*="bg-muted"],
      [data-theme="dark"] .myca-page .myca-live-demo [data-slot="tabs-list"][class*="bg-muted"] {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.062), rgba(255, 255, 255, 0.014) 48%, rgba(255, 255, 255, 0.006)),
          rgba(0, 20, 14, 0.026) !important;
        background-color: rgba(0, 20, 14, 0.026) !important;
      }

      .dark .myca-page .myca-live-demo .myca-live-activity-card,
      .dark .myca-page .myca-live-demo .myca-live-activity-card.neu-raised {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.014) 48%, rgba(255, 255, 255, 0.006)),
          rgba(0, 20, 14, 0.035) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.13),
          0 18px 44px rgba(0, 0, 0, 0.08) !important;
        backdrop-filter: blur(4px) saturate(1.04);
        -webkit-backdrop-filter: blur(4px) saturate(1.04);
      }

      .myca-page .myca-live-demo .myca-chat-header,
      .myca-page .myca-live-demo .myca-chat-input-bar,
      .myca-page .myca-live-demo .myca-activity-log,
      .myca-page .myca-live-demo .myca-confirmation-panel {
        border-color: rgba(255, 255, 255, 0.22) !important;
        background: rgba(255, 255, 255, 0.018) !important;
        backdrop-filter: blur(4px) saturate(1.05);
        -webkit-backdrop-filter: blur(4px) saturate(1.05);
      }

      .dark .myca-page .myca-live-demo .myca-activity-log {
        border-color: rgba(255, 255, 255, 0.18) !important;
        background: rgba(0, 20, 14, 0.025) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .myca-page .myca-live-demo .myca-message-bubble,
      .myca-page .myca-live-demo .myca-activity-log-row {
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018)),
          rgba(255, 255, 255, 0.018) !important;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.055);
        backdrop-filter: blur(3px) saturate(1.05);
        -webkit-backdrop-filter: blur(3px) saturate(1.05);
      }

      .dark .myca-page .myca-live-demo .myca-activity-log-row {
        border-color: rgba(255, 255, 255, 0.16) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.012)),
          rgba(0, 20, 14, 0.018) !important;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      }

      .myca-page .myca-live-demo .myca-message-user {
        background:
          linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(255, 255, 255, 0.045)),
          rgba(34, 197, 94, 0.06) !important;
      }

      .dark .myca-page .myca-live-demo .myca-message-user {
        color: #fff !important;
        -webkit-text-fill-color: #fff;
      }

      .myca-page .myca-live-demo .myca-message-myca {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(16, 185, 129, 0.04)),
          rgba(255, 255, 255, 0.028) !important;
      }

      .myca-page .myca-live-demo textarea,
      .myca-page .myca-live-demo input,
      .myca-page .myca-live-demo .myca-chat-input,
      .myca-page .myca-live-demo pre {
        border-color: rgba(255, 255, 255, 0.24) !important;
        background: rgba(255, 255, 255, 0.035) !important;
        backdrop-filter: blur(5px) saturate(1.08);
        -webkit-backdrop-filter: blur(5px) saturate(1.08);
      }

      html.dark .myca-page .myca-live-demo button,
      html.dark .myca-page .myca-live-demo [role="button"],
      html.dark .myca-page .myca-live-demo .neu-btn,
      html.dark .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"],
      .dark .myca-page .myca-live-demo button,
      .dark .myca-page .myca-live-demo [role="button"],
      .dark .myca-page .myca-live-demo .neu-btn,
      .dark .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"],
      [data-theme="dark"] .myca-page .myca-live-demo button,
      [data-theme="dark"] .myca-page .myca-live-demo [role="button"],
      [data-theme="dark"] .myca-page .myca-live-demo .neu-btn,
      [data-theme="dark"] .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"] {
        border-color: rgba(255, 255, 255, 0.34) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.075) 44%, rgba(255, 255, 255, 0.028)),
          rgba(255, 255, 255, 0.035) !important;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.62);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.28),
          0 12px 28px rgba(0, 0, 0, 0.14) !important;
        backdrop-filter: blur(14px) saturate(1.16) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.16) !important;
      }

      html.dark .myca-page .myca-live-demo button:hover,
      html.dark .myca-page .myca-live-demo [role="button"]:hover,
      .dark .myca-page .myca-live-demo button:hover,
      .dark .myca-page .myca-live-demo [role="button"]:hover,
      [data-theme="dark"] .myca-page .myca-live-demo button:hover,
      [data-theme="dark"] .myca-page .myca-live-demo [role="button"]:hover {
        border-color: rgba(255, 255, 255, 0.56) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.11) 44%, rgba(255, 255, 255, 0.045)),
          rgba(255, 255, 255, 0.05) !important;
      }

      html.dark .myca-page .myca-live-demo .myca-activity-log,
      .dark .myca-page .myca-live-demo .myca-activity-log,
      [data-theme="dark"] .myca-page .myca-live-demo .myca-activity-log {
        border-color: rgba(255, 255, 255, 0.2) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.006)),
          rgba(0, 0, 0, 0.01) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
        backdrop-filter: blur(3px) saturate(1.04) !important;
        -webkit-backdrop-filter: blur(3px) saturate(1.04) !important;
      }

      html.dark .myca-page .myca-live-demo .myca-activity-log-row,
      .dark .myca-page .myca-live-demo .myca-activity-log-row,
      [data-theme="dark"] .myca-page .myca-live-demo .myca-activity-log-row {
        border-color: rgba(255, 255, 255, 0.16) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.006)),
          rgba(0, 0, 0, 0.008) !important;
        box-shadow: none !important;
        backdrop-filter: blur(2px) saturate(1.03) !important;
        -webkit-backdrop-filter: blur(2px) saturate(1.03) !important;
      }

      .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
      html.dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
      .dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
      [data-theme="dark"] .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log {
        border-color: rgba(255, 255, 255, 0.22) !important;
        background: transparent !important;
        background-color: transparent !important;
        background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0.004)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
        backdrop-filter: blur(2px) saturate(1.02) !important;
        -webkit-backdrop-filter: blur(2px) saturate(1.02) !important;
      }

      .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
      html.dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
      .dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
      [data-theme="dark"] .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row {
        border-color: rgba(255, 255, 255, 0.16) !important;
        background: rgba(255, 255, 255, 0.018) !important;
        background-color: rgba(255, 255, 255, 0.018) !important;
        background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.004)) !important;
        box-shadow: none !important;
        backdrop-filter: blur(2px) saturate(1.02) !important;
        -webkit-backdrop-filter: blur(2px) saturate(1.02) !important;
      }

      .neuromorphic-page.home-myca-demo-neu,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark {
        background: linear-gradient(145deg, #1a2030, #141a27) !important;
        background-color: #141a27 !important;
        color: #e5e7eb !important;
      }

      .neuromorphic-page.home-myca-demo-neu .myca-page,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page,
      .home-myca-demo-surface,
      .home-myca-demo-surface .myca-live-demo,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo[data-over-video] {
        background: transparent !important;
        background-color: transparent !important;
      }

      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo .myca-chat-shell,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo .myca-live-panel,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo [data-slot="card"],
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo .neu-raised:not(button),
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo [class*="bg-card"],
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo [class*="bg-muted"] {
        border-color: rgba(255, 255, 255, 0.26) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02) 48%, rgba(255, 255, 255, 0.008)),
          rgba(0, 20, 14, 0.08) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.16),
          0 18px 44px rgba(0, 0, 0, 0.1) !important;
        backdrop-filter: blur(6px) saturate(1.08) !important;
        -webkit-backdrop-filter: blur(6px) saturate(1.08) !important;
      }

      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo .myca-live-activity-card,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark .myca-page .myca-live-demo .myca-live-activity-card.neu-raised {
        border-color: rgba(255, 255, 255, 0.24) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.014) 48%, rgba(255, 255, 255, 0.006)),
          rgba(0, 20, 14, 0.035) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.13),
          0 18px 44px rgba(0, 0, 0, 0.08) !important;
        backdrop-filter: blur(4px) saturate(1.04) !important;
        -webkit-backdrop-filter: blur(4px) saturate(1.04) !important;
      }

      .neuromorphic-page.home-myca-demo-neu,
      .neuromorphic-page.home-myca-demo-neu.neuromorphic-dark,
      .home-myca-demo-neu,
      .home-myca-demo-neu.neuromorphic-dark {
        background: transparent !important;
        background-color: transparent !important;
      }

      .myca-page .myca-live-demo [data-slot="tabs-list"],
      .myca-page .myca-live-demo .myca-chat-header,
      .myca-page .myca-live-demo .myca-chat-input-bar,
      .home-myca-demo-neu .myca-live-demo [data-slot="tabs-list"],
      .home-myca-demo-neu .myca-live-demo .myca-chat-header,
      .home-myca-demo-neu .myca-live-demo .myca-chat-input-bar {
        border-color: rgba(255, 255, 255, 0.25) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.032) 48%, rgba(255, 255, 255, 0.012)),
          rgba(8, 13, 18, 0.055) !important;
        background-color: rgba(8, 13, 18, 0.055) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.17),
          0 16px 38px rgba(0, 0, 0, 0.12) !important;
        backdrop-filter: blur(10px) saturate(1.12) !important;
        -webkit-backdrop-filter: blur(10px) saturate(1.12) !important;
      }

      .myca-page .myca-live-demo [data-slot="tabs-trigger"],
      .myca-page .myca-live-demo .myca-chat-header button,
      .myca-page .myca-live-demo .myca-chat-input-bar button,
      .myca-page .myca-live-demo .myca-confirmation-panel button,
      .home-myca-demo-neu .myca-live-demo [data-slot="tabs-trigger"],
      .home-myca-demo-neu .myca-live-demo .myca-chat-header button,
      .home-myca-demo-neu .myca-live-demo .myca-chat-input-bar button,
      .home-myca-demo-neu .myca-live-demo .myca-confirmation-panel button {
        border: 1px solid rgba(255, 255, 255, 0.34) !important;
        background:
          radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.24), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.17), rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.024)),
          rgba(8, 13, 18, 0.11) !important;
        background-color: rgba(8, 13, 18, 0.11) !important;
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.62) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.25),
          inset 0 -1px 0 rgba(255, 255, 255, 0.08),
          0 12px 28px rgba(0, 0, 0, 0.2) !important;
        backdrop-filter: blur(16px) saturate(1.16) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.16) !important;
      }

      .myca-page .myca-live-demo [data-slot="tabs-trigger"][data-state="active"],
      .home-myca-demo-neu .myca-live-demo [data-slot="tabs-trigger"][data-state="active"] {
        background:
          radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.27), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03)),
          rgba(8, 13, 18, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.44) !important;
      }

      .myca-page .myca-live-demo .myca-chat-input,
      .home-myca-demo-neu .myca-live-demo .myca-chat-input {
        border-color: rgba(255, 255, 255, 0.22) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.012)),
          rgba(8, 13, 18, 0.08) !important;
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.14),
          0 8px 20px rgba(0, 0, 0, 0.08) !important;
      }
    `}</style>
  )
}
