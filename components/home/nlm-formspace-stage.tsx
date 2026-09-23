import Link from "next/link"
import { NlmFormspaceCardActions } from "@/components/home/nlm-formspace-card-actions"
import { ProductIcon, type ProductMarkId } from "@/components/brand/product-icon"

const CARDS: Array<{
  index: string
  title: string
  subtitle: string
  href: string
  paperHref: string
  downloadsHref: string
  videoId: string
  videoTitle: string
  mark: ProductMarkId
  body: string
}> = [
  {
    index: "01",
    title: "Nature Learning Model",
    subtitle: "Environmental Sensing",
    href: "/myca/nlm",
    paperHref: "/docs/ai/nlm",
    downloadsHref: "/myca/nlm/downloads",
    videoId: "6lrvQIfRazs",
    videoTitle: "SI That Sees The World - All Of It.",
    mark: "nlm",
    body: "The Nature Learning Model learns a physical environment through time, which a language model cannot do because a language model learns text. It takes light, sound, gas, electricity, heat, and pressure as one observation, keeps a missing channel empty, and remembers the state that came before. The result is a learned environmental state with an explicit record of what was measured and what was not.",
  },
  {
    index: "02",
    title: "FormSpace",
    subtitle: "Environmental Memory",
    href: "/ai/formspace",
    paperHref: "/docs/ai/formspace",
    downloadsHref: "/ai/formspace/downloads",
    videoId: "HkY86Oee2NE",
    videoTitle: "Mycosoft - Building The Earth Intelligence",
    mark: "formspace",
    body: "FormSpace is Mycosoft’s framework for mapping how biological, physical, and artificial systems organize, adapt, and recover, turning emergent behavior into patterns we can measure, predict, and test. Working with the Nature Learning Model, it connects sensor observations to possible states and trajectories, helping distinguish meaningful organization from noise through controlled experiments and evidence.",
  },
  {
    index: "03",
    title: "MYCA",
    subtitle: "Environmental Intelligence",
    href: "/myca",
    paperHref: "/docs/ai/myca",
    downloadsHref: "/myca/downloads",
    videoId: "zvOBOHpeD5A",
    videoTitle: "Mycosoft — A Better SI",
    mark: "myca",
    body: "MYCA is the intelligence that turns that evidenced state into a course of action. She plans and coordinates Mycosoft’s machines, data, and software, and she holds or reviews the work when the measurement is not yet sufficient. A chatbot answers from language; MYCA does not invent a sensor reading and does not command a machine from a guess.",
  },
]

export function NlmFormspaceStage() {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
      {CARDS.map((card) => (
        <article
          key={card.title}
          className="group relative z-20 flex h-full flex-col rounded-2xl border border-black/10 bg-white/55 text-center text-black shadow-[0_18px_40px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-black/20 hover:shadow-[0_24px_48px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-0 active:scale-[0.985] dark:border-white/35 dark:bg-white/10 dark:text-white dark:shadow-[0_22px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] dark:hover:border-white/60 dark:hover:shadow-[0_28px_56px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.55)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-all duration-500 ease-out group-hover:left-full group-hover:opacity-100" />
          </div>
          <Link href={card.href} className="relative flex flex-1 flex-col text-center">
            <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-t-2xl bg-transparent sm:h-32">
              <ProductIcon
                product={card.mark}
                variant="glass"
                className="h-20 w-20 bg-transparent sm:h-24 sm:w-24"
                title={card.title}
              />
            </div>
            <div className="flex flex-1 flex-col p-4 text-center sm:p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/70">{card.index}</p>
              <h2 className="mt-1 text-xl font-semibold text-black dark:text-white">{card.title}</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/70">{card.subtitle}</p>
              <p className="mt-2 text-xs leading-4 text-black/80 dark:text-white/90">{card.body}</p>
            </div>
          </Link>
          <NlmFormspaceCardActions
            paperHref={card.paperHref}
            downloadsHref={card.downloadsHref}
            videoId={card.videoId}
            videoTitle={card.videoTitle}
          />
        </article>
      ))}
    </div>
  )
}
