import { NextResponse } from "next/server"
import { OWNER_ALLOWED_EMAILS } from "@/lib/access/routes"
export {
  FUSARIUM_OWNER_LOGIN_PATH,
  fusariumAuthErrorPath,
  isFusariumOperatorAppPath,
  isFusariumPublicPath,
  isFusariumRelativePath,
} from "@/lib/auth/fusarium-paths"

export function isFusariumOwnerEmail(email: string | null | undefined): boolean {
  return OWNER_ALLOWED_EMAILS.includes((email || "").toLowerCase().trim())
}

export function fusariumOwnerDeniedResponse(): NextResponse {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Fusarium access denied</title></head>
  <body style="margin:0;background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif">
    <main style="min-height:100dvh;padding:2rem">
      <section style="max-width:36rem;margin:3rem auto;padding:1.5rem;border:1px solid #7f1d1d;border-radius:1rem;background:#09090b">
        <p style="color:#f87171;font-size:0.75rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase">Fusarium access denied</p>
        <h1 style="margin:0.75rem 0 0;font-size:1.75rem">Owner authorization required</h1>
        <p style="color:#a1a1aa;line-height:1.6">This signed-in account is not authorized for the Fusarium operational console.</p>
        <p><a href="/auth/logout" style="color:#e4e4e7">Sign out and use an owner account</a></p>
      </section>
    </main>
  </body>
</html>`,
    {
      status: 403,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  )
}
