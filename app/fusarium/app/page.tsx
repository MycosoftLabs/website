import { redirect } from "next/navigation"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"

export const dynamic = "force-dynamic"

/** Alias kept so existing owner bookmarks land on the twins-host console, not the four-card stub. */
export default function FusariumOperatorAppAliasPage() {
  redirect(FUSARIUM_OPERATOR_APP_PATH)
}
