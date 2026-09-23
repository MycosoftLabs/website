import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("NLM training application placement", () => {
  it("removes the live arithmetic stage from NLM and FormSpace", () => {
    expect(read("app/myca/nlm/page.tsx")).not.toContain("NatureMathStage")
    expect(read("app/ai/formspace/page.tsx")).not.toContain("NatureMathStage")
  })

  it("mounts the real NLM training application under the NLM hero", () => {
    const page = read("app/myca/nlm/page.tsx")

    expect(page).toContain("NlmTrainingApplication")
    expect(page.indexOf("<NlmTrainingApplication")).toBeLessThan(page.indexOf("<NLMStatsPanel"))
  })

  it("uses the same training application on the full training route", () => {
    expect(read("app/natureos/model-training/page.tsx")).toContain(
      "<NlmTrainingApplication",
    )
  })
})
