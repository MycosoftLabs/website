import { FUSARIUM_OWNER_LOGIN_PATH } from "@/lib/auth/fusarium-owner-gate"

export const FUSARIUM_MFA_CHALLENGE_PATH = "/fusarium/mfa/challenge"
export const FUSARIUM_MFA_ENROLL_PATH = "/fusarium/mfa/enroll"

export interface FusariumMfaState {
  verifiedFactorCount: number
  needsChallenge: boolean
  canEnroll: boolean
}

interface MfaClient {
  auth: {
    mfa: {
      getAuthenticatorAssuranceLevel: () => Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null
        error: { message?: string } | null
      }>
      listFactors: () => Promise<{
        data: { totp?: Array<{ id: string; status: string }> | null } | null
        error: { message?: string } | null
      }>
    }
  }
}

export async function getFusariumMfaState(supabase: MfaClient): Promise<FusariumMfaState> {
  try {
    const [{ data: aal }, { data: factors, error: factorError }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])

    if (factorError) {
      return { verifiedFactorCount: 0, needsChallenge: false, canEnroll: true }
    }

    const verified = (factors?.totp || []).filter((factor) => factor.status === "verified")
    const needsChallenge =
      verified.length > 0 && aal?.currentLevel !== "aal2" && aal?.nextLevel === "aal2"

    return {
      verifiedFactorCount: verified.length,
      needsChallenge,
      canEnroll: verified.length === 0,
    }
  } catch {
    return { verifiedFactorCount: 0, needsChallenge: false, canEnroll: true }
  }
}

export function fusariumMfaLoginHref(next: string): string {
  return `${FUSARIUM_OWNER_LOGIN_PATH}?redirectTo=${encodeURIComponent(next)}`
}
