"use client"

import { FormSpacePaperRenderer } from "@/components/docs/formspace-paper-renderer"
import { cn } from "@/lib/utils"

export interface FormSpaceDocsSectionProps {
  id: string
  title: string
  markdown: string
  className?: string
}

/**
 * Single focused paper section body for the icon-switched docs panel.
 * No accordion — parent shows exactly one of these at a time.
 */
export function FormSpaceDocsSection({
  id,
  title,
  markdown,
  className,
}: FormSpaceDocsSectionProps) {
  return (
    <article
      id={id}
      aria-label={title}
      className={cn("min-h-0 text-sm leading-relaxed", className)}
    >
      <h2 className="sr-only">{title}</h2>
      <FormSpacePaperRenderer markdown={markdown} />
    </article>
  )
}
