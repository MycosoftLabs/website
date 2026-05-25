import { PetriDishV2App } from "@/components/petri-dish-v2/petri-dish-app"

export function PetriDishV2Embed() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/30 bg-white/30 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <PetriDishV2App />
    </div>
  )
}
