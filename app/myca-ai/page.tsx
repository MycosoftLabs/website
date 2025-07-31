import type { Metadata } from "next"
import MycaChatComponent from "@/components/natureos/MycaChatComponent"

export const metadata: Metadata = {
  title: "Myca AI - Mycosoft",
  description: "Your AI-powered mycology research assistant",
}

export default function MycaAIPage() {
  return (
    <div className="container flex h-[calc(100vh-4rem)] flex-col py-6">
      <h1 className="text-3xl font-bold mb-8">Myca AI Assistant</h1>
      <MycaChatComponent />
    </div>
  )
}
