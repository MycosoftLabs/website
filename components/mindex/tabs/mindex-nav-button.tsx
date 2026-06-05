"use client"

import type { NavItem } from "./mindex-dashboard-types"

export function MindexNavButton({
  item,
  isActive,
  isCollapsed,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive ? "bg-purple-500/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
      style={{
        boxShadow: isActive ? `0 0 20px ${item.color}40` : undefined,
        borderLeft: isActive ? `2px solid ${item.color}` : "2px solid transparent",
      }}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" style={{ color: isActive ? item.color : undefined }} />
      {!isCollapsed ? <span className="text-sm font-medium truncate">{item.label}</span> : null}
      {isActive && !isCollapsed ? (
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
      ) : null}
    </button>
  )
}
