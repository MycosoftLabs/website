"use client"

/**
 * DEPRECATED: MYCAChatPanel
 * Use components/myca/MYCAChatWidget instead.
 */

import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget"

interface MYCAChatPanelProps {
  className?: string
}

export function MYCAChatPanel({ className }: MYCAChatPanelProps) {
  return <MYCAChatWidget className={className} />
}
