/**
 * Client-safe Fusarium path helpers. Do not import next/server here —
 * AppShell and other client modules use these to hide the public header.
 */

export const FUSARIUM_OWNER_LOGIN_PATH = "/fusarium/login"

const FUSARIUM_PUBLIC_PREFIXES = [
  "/fusarium/login",
  "/fusarium/auth",
  "/fusarium/launchpad",
  "/fusarium/reset-password",
]

export function isFusariumPublicPath(path: string): boolean {
  const pathname = path.split("?")[0] || ""
  return FUSARIUM_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isFusariumOperatorAppPath(path: string): boolean {
  const pathname = path.split("?")[0] || ""
  if (isFusariumPublicPath(pathname)) return false
  return pathname === "/fusarium" || pathname.startsWith("/fusarium/")
}

export function isFusariumRelativePath(path: string): boolean {
  return path.startsWith("/fusarium/") || path === "/fusarium"
}

export function fusariumAuthErrorPath(next: string): string {
  return isFusariumRelativePath(next) ? FUSARIUM_OWNER_LOGIN_PATH : "/login"
}
