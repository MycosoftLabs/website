import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  const { messages } = await req.json()

  const prompt = messages.map((message) => message.content).join("\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: `You are Myca AI, an expert mycology research assistant.\n${prompt}`,
  })

  return new Response(text)
}
