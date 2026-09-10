import { redirect } from "next/navigation"

/**
 * Alias for the Fusarium operations board. Catalog id is situational-awareness;
 * /fusarium/soc was 404 on 10 Sep 2026 browser pass.
 */
export const dynamic = "force-dynamic"

export default function FusariumSocAliasPage() {
  redirect("/fusarium/situational-awareness")
}
