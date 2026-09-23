import { redirect } from "next/navigation"

/**
 * App suite landing removed (Sep 22, 2026). Science / research / developer
 * tools live under NatureOS; defense tools under Defense / Fusarium.
 */
export default function AppsPageRedirect() {
  redirect("/natureos")
}
