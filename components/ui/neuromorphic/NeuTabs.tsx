"use client"

/**
 * Neuromorphic Tabs component
 * Tab navigation with inset container and keyboard support.
 * Date: Feb 18, 2026
 */

import { type ReactNode, type KeyboardEvent } from "react"

export interface NeuTab {
  id: string
  label: string
}

export interface NeuTabsProps {
  tabs: NeuTab[]
  activeIndex: number
  onTabChange: (index: number) => void
  children: ReactNode
  ariaLabel?: string
  className?: string
}

export function NeuTabs({
  tabs,
  activeIndex,
  onTabChange,
  children,
  ariaLabel = "Component categories",
  className = "",
}: NeuTabsProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      onTabChange((i + 1) % tabs.length)
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      onTabChange((i - 1 + tabs.length) % tabs.length)
    }
    if (e.key === "Home") {
      e.preventDefault()
      onTabChange(0)
    }
    if (e.key === "End") {
      e.preventDefault()
      onTabChange(tabs.length - 1)
    }
  }

  return (
    <>
      <nav
        className={`mb-12 overflow-x-auto neu-custom-scrollbar ${className}`}
        aria-label={ariaLabel}
      >
        <div
          className="flex gap-2 p-2 rounded-2xl mx-auto w-fit min-w-max neu-inset"
          role="tablist"
          aria-orientation="horizontal"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeIndex === i}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeIndex === i ? 0 : -1}
              className="neu-tab-btn neu-focus px-6 py-3 rounded-xl text-sm font-medium transition-all"
              onClick={() => onTabChange(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      {children}
    </>
  )
}

export interface NeuTabsListProps {
  children: ReactNode
}

export function NeuTabsList({ children }: NeuTabsListProps) {
  return (
    <div
      className="flex gap-2 p-2 rounded-2xl w-fit min-w-max neu-inset"
      role="tablist"
    >
      {children}
    </div>
  )
}

export interface NeuTabsTriggerProps {
  id: string
  label: string
  isActive: boolean
  onClick: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
  panelId: string
}

export function NeuTabsTrigger({
  id,
  label,
  isActive,
  onClick,
  onKeyDown,
  panelId,
}: NeuTabsTriggerProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      className="neu-tab-btn neu-focus px-6 py-3 rounded-xl text-sm font-medium transition-all"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {label}
    </button>
  )
}

export interface NeuTabsContentProps {
  id: string
  tabId: string
  isActive: boolean
  children: ReactNode
  className?: string
}

export function NeuTabsContent({
  id,
  tabId,
  isActive,
  children,
  className = "tab-panel",
}: NeuTabsContentProps) {
  if (!isActive) return null

  return (
    <section
      id={id}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </section>
  )
}
