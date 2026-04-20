"use client"

/**
 * Next.js 15 root-level error boundary.
 *
 * Catches errors in the root layout. Without this file Next.js 15 emits
 * the dev warning "missing required error components, refreshing..." and
 * will silently attempt a refresh instead of surfacing the actual error.
 *
 * Paired with app/error.tsx (route-level) + app/not-found.tsx (404). This
 * file catches the remaining case: errors bubbling up through the root
 * layout itself (e.g. provider-level crashes).
 */

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error to console so it's visible even when the UI is
    // still hydrating. Production: a monitoring hook can tap into this.
    // eslint-disable-next-line no-console
    console.error("[global-error]", error)
  }, [error])

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 640, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 8, color: "#60a5fa" }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.8, marginBottom: 16 }}>
            A root-level error occurred. Try again or return to the
            dashboard. If it persists, check the browser console for details.
          </p>
          {error?.message ? (
            <pre
              style={{
                textAlign: "left",
                background: "#111827",
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 16,
                overflow: "auto",
                maxHeight: 160,
              }}
            >
              {error.message}
              {error.digest ? `\n\n(digest: ${error.digest})` : ""}
            </pre>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              marginRight: 8,
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              color: "#60a5fa",
              textDecoration: "none",
              border: "1px solid #2563eb",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  )
}
