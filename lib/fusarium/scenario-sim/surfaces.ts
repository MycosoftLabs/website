import { FUSARIUM_SECTIONS } from "@/components/fusarium/fusarium-catalog"
import type { ScenarioBindStatus, ScenarioSurface } from "./contracts"

const ITDX_PANELS: Array<{ id: string; title: string; href: string; source: string; bind: ScenarioBindStatus; note: string }> = [
  {
    id: "itdx-lab",
    title: "ITDX Algorithm Lab",
    href: "/fusarium/itdx",
    source: "lib/itdx/lab-web + lab-catalog",
    bind: "BOUND",
    note: "Packaged v1.4 lab UI. Optional 8765 compute stays NOT_SUPPLIED unless that service is bound.",
  },
  {
    id: "itdx-briefing",
    title: "ITDX synthetic Army intel briefing",
    href: "/fusarium/itdx",
    source: "lib/itdx/synthetic-briefing.ts",
    bind: "BOUND",
    note: "SYNTHETIC EXERCISE. Official injects 1–5 remain NOT_SUPPLIED.",
  },
  {
    id: "itdx-walkthrough",
    title: "ITDX Weka / walkthrough",
    href: "/fusarium/itdx",
    source: "/api/fusarium/itdx/weka-receipt",
    bind: "BOUND",
    note: "Recorded-bundle receipt. Not an invented PASS.",
  },
  {
    id: "itdx-situation",
    title: "ITDX situation / Intel Feed",
    href: "/fusarium/itdx",
    source: "/api/fusarium/itdx/situation",
    bind: "BOUND",
    note: "Website-local Fort Stewart binds. Empty live rows are NO_DATA, not no source.",
  },
  {
    id: "itdx-earth-overlay",
    title: "ITDX Earth Sim overlay",
    href: "/fusarium/earth-simulator",
    source: "components/itdx/ITDXEarthSimOverlay.tsx",
    bind: "BOUND",
    note: "Collapsed at idle. live=false. No flyTo on first paint.",
  },
  {
    id: "itdx-replay",
    title: "ITDX replay / movement",
    href: "/fusarium/earth-simulator",
    source: "lib/itdx/replay-core.mjs",
    bind: "BOUND",
    note: "121-sample Fort Stewart tangent-plane exercise. Clock floor 400ms.",
  },
  {
    id: "personnel-duty",
    title: "Personnel duty / 180 roles",
    href: "/fusarium/personnel",
    source: "lib/fusarium/personnel/catalog.ts",
    bind: "BOUND",
    note: "Proposed personas. Not a named unit roster.",
  },
  {
    id: "personnel-survey",
    title: "Personnel survey",
    href: "/fusarium/personnel/survey",
    source: "/api/fusarium/personnel/surveys",
    bind: "BOUND",
    note: "Empty until a real submit. No invented outcomes.",
  },
  {
    id: "personnel-outcomes",
    title: "Personnel outcomes / KO",
    href: "/fusarium/personnel/outcomes",
    source: "lib/fusarium/personnel/human-outcomes.ts",
    bind: "BOUND",
    note: "Not-measured stays not-measured.",
  },
  {
    id: "nlm-training",
    title: "NLM Training Dashboard",
    href: "/fusarium/nlm-training",
    source: "/api/fusarium/nlm/status + MAS /api/nlm/*",
    bind: "BOUND",
    note: "Honest MAS FormSpace NLM. bound_to_ollama=false. p=null. Weights from /api/nlm/weights.",
  },
  {
    id: "official-injects",
    title: "Official Army injects 1–5",
    href: "/fusarium/itdx",
    source: "never-supplied",
    bind: "NOT_SUPPLIED",
    note: "FOUO Army PDFs are STOP_INGEST. Injects stay NOT_SUPPLIED.",
  },
  {
    id: "optional-8765",
    title: "Optional ITDX 8765/8766 compute",
    href: "/fusarium/itdx",
    source: "ITDX optional compute",
    bind: "NOT_SUPPLIED",
    note: "Packaged UI only unless that process is bound.",
  },
]

function catalogBind(id: string): { bind: ScenarioBindStatus; source: string; note: string } {
  switch (id) {
    case "overview":
      return { bind: "BOUND", source: "lib/fusarium/overview + scenario-sim", note: "Overview cards + interop bus." }
    case "earth-simulator":
      return { bind: "BOUND", source: "CREPDashboardLoader + ITDX overlay", note: "Idle all-off stays smooth. Live Data not forced on." }
    case "itdx":
      return { bind: "BOUND", source: "ITDXApplication", note: "Algorithm Lab + briefing + tabs." }
    case "personnel":
    case "personnel-outcomes":
    case "personnel-survey":
      return { bind: "BOUND", source: "personnel catalog packet", note: "180 proposed roles." }
    case "nlm-training":
      return { bind: "BOUND", source: "MAS NLM 188:8001", note: "Real checkpoints only. No Ollama bind." }
    case "oei":
      return { bind: "BOUND", source: "OEI BFF aliases", note: "Filters-off stays dark. Not a live COP." }
    case "crep":
      return { bind: "BOUND", source: "website CREP BFF", note: "Idle does not enable planet-wide tracks." }
    case "situational-awareness":
    case "threat-assessment":
    case "data-fusion":
    case "command-control":
      return { bind: "BOUND", source: "lib/fusarium/* scenario providers", note: "Exercise context when the sim test runs." }
    case "mindex":
      return { bind: "BOUND", source: "MINDEX 189:8000", note: "Empty rows are NO_DATA, not no source." }
    default:
      return {
        bind: "IDLE",
        source: "Fusarium console route",
        note: "Route exists. Lit during the interop test as a bound console surface, not as live telemetry.",
      }
  }
}

export function listScenarioSurfaces(running: boolean): ScenarioSurface[] {
  const apps: ScenarioSurface[] = FUSARIUM_SECTIONS.flatMap((section) =>
    section.items.map((item) => {
      const meta = catalogBind(item.id)
      const lit = running && meta.bind !== "NOT_SUPPLIED"
      return {
        id: `app-${item.id}`,
        title: `${section.title} / ${item.title}`,
        href: item.href,
        kind: "app" as const,
        bind: lit ? "LIT" : meta.bind,
        source: meta.source,
        note: meta.note,
        lit,
      }
    }),
  )
  const panels: ScenarioSurface[] = ITDX_PANELS.map((panel) => {
    const lit = running && panel.bind !== "NOT_SUPPLIED"
    return {
      id: panel.id,
      title: panel.title,
      href: panel.href,
      kind: panel.id.includes("overlay") ? "overlay" : "panel",
      bind: panel.bind === "NOT_SUPPLIED" ? "NOT_SUPPLIED" : lit ? "LIT" : panel.bind,
      source: panel.source,
      note: panel.note,
      lit,
    }
  })
  return [...apps, ...panels]
}
