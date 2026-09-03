/**
 * Public Fusarium operator login — a path on mycosoft.com, not a DNS name.
 * Explore CTA must never point at loopback.
 */

export const FUSARIUM_OPERATOR_LOGIN_PATH = "/fusarium/login"
export const FUSARIUM_OPERATOR_APP_PATH = "/fusarium/app"
export const FUSARIUM_PUBLIC_LOGIN_HREF = "https://mycosoft.com/fusarium/login"
export const FUSARIUM_SANDBOX_LOGIN_HREF = "https://sandbox.mycosoft.com/fusarium/login"
export const FUSARIUM_CONSOLE_REDIRECT = FUSARIUM_OPERATOR_APP_PATH

export function getFusariumLoginHref(hostname?: string): string {
  const host = (hostname || "").toLowerCase().split(":")[0]
  if (host === "sandbox.mycosoft.com") return FUSARIUM_SANDBOX_LOGIN_HREF
  return FUSARIUM_PUBLIC_LOGIN_HREF
}
