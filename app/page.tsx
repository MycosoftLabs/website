// Static import so the search bar always renders (no dynamic loading that can hide it)
import ParallaxSearch from "@/components/home/parallax-search"

export default function HomePage() {
  return (
    // min-h-[calc(100dvh-3rem)] on phone (48px header), 3.5rem on desktop (56px header)
    <div className="container max-w-7xl mx-auto px-3 sm:px-4 relative min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center py-4 sm:py-8">
      <ParallaxSearch />
    </div>
  )
}
