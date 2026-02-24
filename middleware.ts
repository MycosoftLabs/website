/**
 * Middleware - handles case-sensitive redirects that next.config.js can't do safely
 * /MYCA (uppercase) -> /myca to support legacy links
 * Explicit check avoids redirect loop (only /MYCA redirects, not /myca)
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === "/MYCA") {
    return NextResponse.redirect(new URL("/myca", request.url), 302)
  }
  return NextResponse.next()
}
