import { FusariumGrowthAnalyticsMount } from "@/components/fusarium/twins/growth-analytics/growth-analytics-mount"

/**
 * /fusarium/growth-analytics — explicit remount of /natureos/growth-analytics.
 * Civilian /apps/growth-analytics is not this contract route.
 */
export default function FusariumGrowthAnalyticsPage() {
  return <FusariumGrowthAnalyticsMount />
}
