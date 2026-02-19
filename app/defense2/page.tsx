import { redirect } from "next/navigation"

/** Redirect /defense2 to /defense - Defense 2 (neuromorphic) is now the main defense page. */
export default function Defense2Page() {
  redirect("/defense")
}
