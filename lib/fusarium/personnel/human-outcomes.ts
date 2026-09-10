/** Descriptive arithmetic only. Missing stays missing. Zero baseline has no relative %. */

export interface ReductionResult {
  status: "NOT_MEASURED" | "DESCRIPTIVE_COMPARISON" | "COMPARABILITY_AND_UNIT_REQUIRED"
  absolute_reduction: number | null
  relative_reduction_percent: number | null
}

export function reduction(before: number | null | undefined, after: number | null | undefined): ReductionResult {
  if (before === null || before === undefined || after === null || after === undefined) {
    return { status: "NOT_MEASURED", absolute_reduction: null, relative_reduction_percent: null }
  }
  return {
    status: "DESCRIPTIVE_COMPARISON",
    absolute_reduction: before - after,
    relative_reduction_percent: before === 0 ? null : (100 * (before - after)) / before,
  }
}

export function taskLaborHours(input: {
  taskCount: number | null
  manualMinutes: number | null
  assistedMinutes: number | null
  reviewMinutes: number | null
  reworkMinutes: number | null
  supportHours: number | null
}) {
  const { taskCount, manualMinutes, assistedMinutes, reviewMinutes, reworkMinutes, supportHours } = input
  if (
    taskCount === null ||
    manualMinutes === null ||
    assistedMinutes === null ||
    reviewMinutes === null ||
    reworkMinutes === null ||
    supportHours === null
  ) {
    return {
      H0: null,
      H1: null,
      deltaH: null,
      labor_reduction_percent: null,
      status: "NOT_MEASURED" as const,
    }
  }
  const H0 = (taskCount * manualMinutes) / 60
  const H1 = (taskCount * (assistedMinutes + reviewMinutes + reworkMinutes)) / 60 + supportHours
  const deltaH = H0 - H1
  return {
    H0,
    H1,
    deltaH,
    labor_reduction_percent: H0 > 0 ? (100 * (H0 - H1)) / H0 : null,
    status: "DESCRIPTIVE_COMPARISON" as const,
  }
}

export const PACKAGE_CALC_CHECKS_PASSED = 22
