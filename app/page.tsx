// Static import so the search bar always renders (no dynamic loading that can hide it)
import ParallaxSearch from "@/components/home/parallax-search"

export default function HomePage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <ParallaxSearch />
    </div>
  )
}
