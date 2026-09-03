/**
 * Fusarium mount boundary for Nature Statistics.
 *
 * The NatureOS source and apps/twins/nature-statistics snapshots stay
 * immutable. Fusarium restores the exact working Nature Statistics composition
 * and only applies navigation, width, and glass-theme treatment at this mount.
 */
import { NatureStatisticsView } from "@/components/natureos/nature-statistics-view"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"
import { FusariumNatureStatisticsOperationalView } from "@/components/fusarium/twins/nature-statistics/nature-statistics-operational-view"

export function FusariumNatureStatisticsMount() {
  return (
    <FusariumTwinSurface>
      <div
        className="min-h-full w-full bg-black/55 text-zinc-100 [&_.container]:!mx-0 [&_.container]:!w-full [&_.container]:!max-w-none [&_.container]:!px-3 [&_.container]:!py-4 sm:[&_.container]:!px-4 xl:[&_.container]:!px-5"
        data-fusarium-nature-statistics
        data-nature-statistics-parity="natureos-primary"
        data-layout="edge-to-edge-responsive-parity"
      >
        <style data-population-roller-width-fix>{`
          [data-nature-statistics-parity="natureos-primary"] [data-slot="card"] {
            --tw-gradient-from: rgba(16, 185, 129, .08) !important;
            --tw-gradient-via: rgba(39, 39, 42, .18) !important;
            --tw-gradient-to: rgba(0, 0, 0, .58) !important;
            background-color: rgba(9, 12, 11, .62) !important;
            border-color: rgba(161, 161, 170, .18) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 18px 55px rgba(0,0,0,.32) !important;
            -webkit-backdrop-filter: blur(18px) saturate(125%);
            backdrop-filter: blur(18px) saturate(125%);
          }
          [data-nature-statistics-parity="natureos-primary"] [data-slot="card"] [class*="rounded-lg"][class*="bg-"] {
            --tw-gradient-from: rgba(16, 185, 129, .07) !important;
            --tw-gradient-via: rgba(39, 39, 42, .14) !important;
            --tw-gradient-to: rgba(0, 0, 0, .38) !important;
            background-color: rgba(10, 14, 13, .48) !important;
            border-color: rgba(161, 161, 170, .16) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.04) !important;
            -webkit-backdrop-filter: blur(12px) saturate(120%);
            backdrop-filter: blur(12px) saturate(120%);
          }
          [data-nature-statistics-parity="natureos-primary"] :is(
            [class*="text-blue-"], [class*="text-cyan-"], [class*="text-indigo-"],
            [class*="text-purple-"], [class*="text-violet-"], [class*="text-sky-"]
          ) {
            color: rgb(110 231 183) !important;
          }
          [data-nature-statistics-parity="natureos-primary"] [data-slot="card"] > [style*="background-image"] {
            opacity: .22 !important;
            filter: saturate(.72) contrast(1.08);
          }
          [data-nature-statistics-parity="natureos-primary"] [data-slot="card"] .text-xl.tabular-nums {
            font-size: clamp(1.5rem, 2vw, 2rem) !important;
            line-height: 1.05 !important;
          }
          [data-nature-statistics-parity="natureos-primary"] [data-slot="card"] .text-sm.tabular-nums {
            font-size: 1rem !important;
            line-height: 1.15 !important;
          }
          [data-nature-statistics-parity="natureos-primary"] .max-w-full .values {
            width: min(13ch, 100%) !important;
          }
          @media (max-width: 639px) {
            [data-nature-statistics-parity="natureos-primary"] [data-slot="card-content"].flex-row {
              align-items: stretch;
              flex-direction: column;
            }
            [data-nature-statistics-parity="natureos-primary"] [data-slot="card-content"].flex-row > .flex {
              flex-wrap: wrap;
            }
            [data-nature-statistics-parity="natureos-primary"] [data-slot="card-content"].flex-row button {
              flex: 1 1 10rem;
              min-width: 0;
            }
          }
        `}</style>
        <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-2 text-[9px] uppercase tracking-[.11em] text-zinc-400 sm:mx-4 xl:mx-5" data-fusarium-provenance-strip>
          <span className="font-semibold text-emerald-300">Source notes</span>
          <span>Population: estimate feed</span>
          <span>Species: MINDEX</span>
          <span>Agents: MAS + global-agent registries</span>
        </div>
        <NatureStatisticsView />
        <FusariumNatureStatisticsOperationalView />
      </div>
    </FusariumTwinSurface>
  )
}
