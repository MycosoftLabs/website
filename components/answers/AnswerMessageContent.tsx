"use client"

/**
 * AnswerMessageContent - Feb 10, 2026
 *
 * Renders MYCA answer content with markdown, code blocks, links, and images.
 * Used in AnswersWidget and MobileSearchChat.
 */

import React from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { AnswerEmbedBlock, type AnswerEmbedPayload } from "@/components/answers/AnswerEmbedBlock"

interface AnswerMessageContentProps {
  content: string
  className?: string
  onFocusWidget?: (widgetType: string) => void
}

const components: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet-400 hover:text-violet-300 underline break-all"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith("language-")
    if (isBlock) {
      return (
        <pre className="my-2 p-3 rounded-lg bg-black/30 overflow-x-auto text-xs">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="px-1.5 py-0.5 rounded bg-black/20 text-violet-300 text-[0.9em]" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
  p: ({ children }) => <p className="my-1.5 [&:last-child]:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-violet-500/50 pl-3 my-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  img: ({ src, alt }) => {
    if (!src) return null
    return (
      <span className="block my-2">
        <Image
          src={src}
          alt={alt || ""}
          className="max-w-full rounded-lg border border-white/10 h-auto"
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 768px"
          unoptimized
        />
      </span>
    )
  },
}

function inferEmbedsFromContent(content: string): AnswerEmbedPayload[] {
  const lower = content.toLowerCase()
  const embeds: AnswerEmbedPayload[] = []

  if (lower.includes("crep")) {
    embeds.push({ type: "crep", widgetType: "crep" })
  }
  if (lower.includes("earth2") || lower.includes("weather simulation")) {
    embeds.push({ type: "earth2", widgetType: "earth2" })
  }
  if (lower.includes("telemetry") || lower.includes("mycobrain")) {
    embeds.push({ type: "telemetry", widgetType: "location" })
  }

  return embeds
}

function parseEmbedBlocks(content: string): { markdown: string; embeds: AnswerEmbedPayload[] } {
  // Supported explicit syntax:
  // ```answer-embed
  // {"type":"crep","widgetType":"crep"}
  // ```
  const embeds: AnswerEmbedPayload[] = []
  let markdown = content

  const blockRegex = /```answer-embed\s*([\s\S]*?)```/gi
  markdown = markdown.replace(blockRegex, (_, jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText.trim()) as AnswerEmbedPayload
      if (parsed?.type) embeds.push(parsed)
    } catch {
      // Keep renderer resilient for malformed blocks
    }
    return ""
  })

  // Supported inline syntax: [embed:crep]
  markdown = markdown.replace(/\[embed:(crep|earth2|telemetry)\]/gi, (_, embedType: string) => {
    embeds.push({ type: embedType as AnswerEmbedPayload["type"] })
    return ""
  })

  const inferred = inferEmbedsFromContent(content)
  const deduped = [...embeds]
  for (const embed of inferred) {
    if (!deduped.some((existing) => existing.type === embed.type)) {
      deduped.push(embed)
    }
  }

  return { markdown: markdown.trim(), embeds: deduped.slice(0, 2) }
}

export function AnswerMessageContent({ content, className, onFocusWidget }: AnswerMessageContentProps) {
  let textContent = content as any;
  if (typeof textContent !== "string") {
    if (Array.isArray(textContent)) {
      textContent = textContent.map((p: any) => p?.text || "").join("\\n");
    } else if (textContent && typeof textContent === "object") {
      textContent = textContent.text || JSON.stringify(textContent);
    } else {
      return null;
    }
  }

  if (typeof textContent !== "string" || !textContent.trim()) return null;
  const { markdown, embeds } = parseEmbedBlocks(textContent);

  return (
    <div className={cn("text-sm leading-relaxed [&_a]:text-violet-400 [&_a]:underline [&_pre]:my-2 [&_ul]:my-2 [&_ol]:my-2", className)}>
      {markdown ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {markdown}
        </ReactMarkdown>
      ) : null}
      {embeds.map((embed, idx) => (
        <AnswerEmbedBlock key={`${embed.type}-${idx}`} embed={embed} onFocusWidget={onFocusWidget} />
      ))}
    </div>
  )
}

export default AnswerMessageContent
