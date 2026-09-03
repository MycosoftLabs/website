import { redirect } from "next/navigation"

/**
 * Retained /petri-sim alias. The Fusarium alias stays inside this mount.
 */
export default function FusariumPetriSimPage() {
  redirect("/fusarium/virtual-petri-dish")
}
