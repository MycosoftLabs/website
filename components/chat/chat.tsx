"use client"

import { useChat } from "ai/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Bot, Send, User } from "lucide-react"

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()

  return (
    <Card className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
            >
              <div className="rounded-full bg-muted p-2">
                {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-4">
          <Textarea value={input} onChange={handleInputChange} placeholder="Ask about mycology..." className="flex-1" />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </Card>
  )
}
