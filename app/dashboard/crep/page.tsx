// SERVER component — do NOT add "use client" here.
// CREPDashboardLoader handles the dynamic(ssr:false) import so
// WebGL / deck.gl / luma.gl only execute in the browser.
export const dynamic = "force-dynamic"

export { default } from "./CREPDashboardLoader"
