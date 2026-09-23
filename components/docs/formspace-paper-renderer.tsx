import Image from "next/image"
import type { ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import {
  formSpaceSlug,
  getFormSpaceAssetWidth,
  prepareFormSpaceMarkdown,
} from "@/lib/formspace-paper"

interface FormSpacePaperRendererProps {
  markdown: string
}

const IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/assets/formspace-white-paper/recovery-demo.png": { width: 1584, height: 704 },
  "/assets/formspace-white-paper/architecture.png": { width: 1606, height: 990 },
}

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(textFromChildren).join("")
  return ""
}

function CodePanel({
  language,
  children,
}: {
  language: string
  children: ReactNode
}) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-white/15 bg-slate-950 text-slate-50 shadow-lg shadow-black/10 backdrop-blur-xl dark:bg-black/70">
      <div className="border-b border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
        {language || "code"}
      </div>
      <pre className="max-h-[34rem] overflow-auto whitespace-pre p-4 text-sm leading-relaxed">
        <code className="font-mono text-slate-50">{children}</code>
      </pre>
    </div>
  )
}

export function FormSpacePaperRenderer({ markdown }: FormSpacePaperRendererProps) {
  return (
    <div className="formspace-technical-article nlm-technical-article">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1({ children }) {
            const text = textFromChildren(children)
            return (
              <h2
                id={formSpaceSlug(text)}
                className="mt-14 scroll-mt-24 border-t border-border pt-8 text-3xl font-bold tracking-tight"
              >
                {children}
              </h2>
            )
          },
          h2({ children }) {
            const text = textFromChildren(children)
            return (
              <h3
                id={formSpaceSlug(text)}
                className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight"
              >
                {children}
              </h3>
            )
          },
          h3({ children }) {
            const text = textFromChildren(children)
            return (
              <h4
                id={formSpaceSlug(text)}
                className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight"
              >
                {children}
              </h4>
            )
          },
          p({ children }) {
            return <p className="my-5 leading-8 text-foreground/85">{children}</p>
          },
          strong({ children }) {
            const text = textFromChildren(children)
            if (/^Algorithm\s+\d+/i.test(text)) {
              return (
                <strong className="mr-2 inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  {children}
                </strong>
              )
            }
            return <strong className="font-semibold text-foreground">{children}</strong>
          },
          em({ children }) {
            return <em className="italic text-foreground/90">{children}</em>
          },
          ul({ children }) {
            return <ul className="my-5 ml-6 list-disc space-y-2 leading-7">{children}</ul>
          },
          ol({ children }) {
            return <ol className="my-5 ml-6 list-decimal space-y-2 leading-7">{children}</ol>
          },
          li({ children }) {
            return <li className="pl-1 text-foreground/85">{children}</li>
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-6 border-l-4 border-emerald-500/50 pl-5 text-foreground/75">
                {children}
              </blockquote>
            )
          },
          table({ children }) {
            return (
              <div className="not-prose my-8 max-w-full overflow-x-auto rounded-xl border border-white/25 bg-white/60 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
                <table className="min-w-[760px] border-collapse text-sm">{children}</table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-emerald-500/10 text-left">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="border-b border-border px-4 py-3 font-semibold text-foreground">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border-b border-border/60 px-4 py-3 align-top text-foreground/80">
                {children}
              </td>
            )
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-300"
              >
                {children}
              </a>
            )
          },
          img({ src = "", alt = "" }) {
            if (typeof src !== "string") return null
            const dimensions = IMAGE_DIMENSIONS[src]
            if (!dimensions) return null

            return (
              <span
                className="not-prose mx-auto my-8 block max-w-full overflow-hidden rounded-2xl border border-white/20 bg-white/20 p-2 shadow-2xl shadow-black/15 backdrop-blur-xl dark:bg-white/[0.06]"
                style={{ width: getFormSpaceAssetWidth(src) }}
              >
                <Image
                  src={src}
                  alt={alt}
                  width={dimensions.width}
                  height={dimensions.height}
                  sizes="(max-width: 768px) 100vw, 900px"
                  className="h-auto w-full rounded-xl"
                />
                {alt ? (
                  <span className="block px-3 py-3 text-center text-sm leading-6 text-muted-foreground">
                    {alt}
                  </span>
                ) : null}
              </span>
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
          code({ children, className }) {
            const language = /language-(\w+)/.exec(className || "")?.[1]
            const value = String(children).replace(/\n$/, "")

            if (language) return <CodePanel language={language}>{value}</CodePanel>

            return (
              <code className="break-words rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
                {children}
              </code>
            )
          },
        }}
      >
        {prepareFormSpaceMarkdown(markdown)}
      </ReactMarkdown>
    </div>
  )
}
