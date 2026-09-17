import {
  ITDX_FOUR_SHOWCASE,
  ITDX_SHOWCASE_TASK_IDS,
  ITDX_SIXTEEN_OBJECTIVES,
  ITDX_SUPPORTING_STACK,
  assertItdxSixteenComplete,
  itdxObjectivesByStatus,
} from "./sixteen-objectives"

describe("ITDX v2.1 sixteen objectives", () => {
  it("has exactly sixteen public task names and Army showcase 12/13/8/14", () => {
    assertItdxSixteenComplete()
    expect(ITDX_SIXTEEN_OBJECTIVES).toHaveLength(16)
    expect(ITDX_FOUR_SHOWCASE).toHaveLength(4)
    expect([...ITDX_SHOWCASE_TASK_IDS].sort((a, b) => a - b)).toEqual([8, 12, 13, 14])
    expect(ITDX_FOUR_SHOWCASE.map((row) => row.id).sort((a, b) => a - b)).toEqual([8, 12, 13, 14])
    expect(ITDX_SUPPORTING_STACK.map((row) => row.id)).toEqual(["formspace", "nlm", "weka", "trail-ar"])
  })

  it("keeps mapping-tool as the only DEMOABLE_NOW C&E task", () => {
    const demoable = itdxObjectivesByStatus("DEMOABLE_NOW")
    expect(demoable.map((row) => row.id)).toEqual([14])
    expect(demoable[0]?.name).toMatch(/mapping tool/i)
  })

  it("does not invent scores or ingest FOUO body text", () => {
    const blob = JSON.stringify({ ITDX_SIXTEEN_OBJECTIVES, ITDX_SUPPORTING_STACK })
    expect(blob).not.toMatch(/0\.85/)
    expect(blob).not.toMatch(/CUI\/\//)
    expect(blob).not.toMatch(/FOR OFFICIAL USE ONLY/)
    expect(blob).not.toMatch(/forecast_p":\s*0/)
    expect(ITDX_SUPPORTING_STACK.find((row) => row.id === "nlm")?.honesty).toMatch(/forecast_p is null/)
    expect(ITDX_SUPPORTING_STACK.find((row) => row.id === "weka")?.honesty).toMatch(/NOT_YET_SCORED/)
  })
})
