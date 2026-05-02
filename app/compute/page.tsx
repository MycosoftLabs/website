import { ComputeDashboard } from "@/components/compute/compute-dashboard"

export default function ComputePage() {
  return <ComputeDashboard apiPath="/api/compute/snapshot" heading="Compute" />
}
