import { FusariumCompoundAnalyserMount } from "@/components/fusarium/twins/compound-analyser/compound-analyser-mount"

/**
 * /fusarium/compound-analyser — explicit remount of /natureos/compound-analyser.
 * Civilian /apps/compound-sim is not this contract route.
 */
export default function FusariumCompoundAnalyserPage() {
  return <FusariumCompoundAnalyserMount />
}
