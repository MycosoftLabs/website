import { GlassChip } from "@/components/ui/glass-button"

const INTRO_BLOCKS = [
  {
    title: "What FormSpace is",
    body: "FormSpace is Mycosoft's map of environmental states. It places sensor signals — spectral, acoustic, thermal, gas (VOC), soil, weather, and fungal electrical activity — onto typed charts, so you can see where a place or sample sits and how it moves over time.",
  },
  {
    title: "What it's for",
    body: "Compare states, replay how a signal evolves, and test whether a system returns to normal after a disturbance (a recovery trial). Every result is logged as evidence with its source, so demo fixtures are never mistaken for live readings.",
  },
  {
    title: "How it relates to NLM",
    body: "The Nature Learning Model (NLM) is a family of signal-state and scenario models trained on environmental data. NLM writes the coordinates — it turns raw signals into a position and a trajectory. FormSpace is the map those coordinates live on. NLM learns from signals, not words; it is not a chat or text model.",
  },
] as const

const ACCESS_LEVELS = [
  {
    title: "Without an account",
    items: [
      "Browse the full chart atlas",
      "Compute graphs and run recovery trials on labeled demo fixtures",
      "Read the shared evidence log",
    ],
  },
  {
    title: "Signed in",
    items: [
      "Everything above",
      "Save your own charts",
      "Keep experiment memory tied to your account",
      "Link charts to NLM models",
    ],
  },
] as const

const FIRST_STEPS = [
  "Pick a chart in Atlas",
  "Open Graphs and compute its trajectory",
  "Run a recovery trial in Experiments",
  "Check the result in Evidence",
] as const

/** Plain-language orientation for first-time FormSpace visitors. */
export function FormSpaceIntro() {
  return (
    <section
      aria-labelledby="formspace-intro-heading"
      className="mt-6 rounded-2xl border border-black/10 bg-white/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl sm:p-5 md:p-6 dark:border-white/15 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="formspace-intro-heading"
          className="text-lg font-semibold tracking-tight text-black sm:text-xl dark:text-white"
        >
          New to FormSpace? Start here.
        </h2>
        <GlassChip>Getting started</GlassChip>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {INTRO_BLOCKS.map((block) => (
          <div
            key={block.title}
            className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20"
          >
            <h3 className="text-sm font-semibold text-black dark:text-white">{block.title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/70 dark:text-white/75">{block.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {ACCESS_LEVELS.map((level) => (
          <div
            key={level.title}
            className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20"
          >
            <h3 className="text-sm font-semibold text-black dark:text-white">{level.title}</h3>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-black/70 dark:text-white/75">
              {level.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-black/40 dark:text-white/40">
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20">
          <h3 className="text-sm font-semibold text-black dark:text-white">Your first run</h3>
          <ol className="mt-2 space-y-1 text-sm leading-6 text-black/70 dark:text-white/75">
            {FIRST_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-mono text-black/45 dark:text-white/45">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
