"use client"

/**
 * Neuromorphic Card component
 * Raised card with header and content areas.
 * Date: Feb 18, 2026
 */

import { type HTMLAttributes, type ReactNode } from "react"

export interface NeuCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export interface NeuCardHeaderProps {
  children: ReactNode
  className?: string
}

export interface NeuCardContentProps {
  children: ReactNode
  className?: string
}

export function NeuCard({ children, className = "", ...props }: NeuCardProps) {
  return (
    <div
      className={`neu-raised p-6 rounded-3xl ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function NeuCardHeader({ children, className = "" }: NeuCardHeaderProps) {
  return (
    <div
      role="group"
      className={`text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2 ${className}`}
    >
      {children}
    </div>
  )
}

export function NeuCardContent({ children, className = "" }: NeuCardContentProps) {
  return <div className={className}>{children}</div>
}
