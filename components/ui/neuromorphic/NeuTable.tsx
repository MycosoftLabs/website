"use client"

/**
 * Neuromorphic Table component
 * Data table with optional search and status badges.
 * Date: Feb 18, 2026
 */

import { type ReactNode } from "react"

export interface NeuTableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

export interface NeuTableProps<T extends Record<string, unknown>> {
  columns: NeuTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchLabel?: string
  className?: string
}

export function NeuTable<T extends Record<string, unknown>>({
  columns,
  data,
  getRowKey,
  searchable = false,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  searchLabel = "Search",
  className = "",
}: NeuTableProps<T>) {
  return (
    <div className={className}>
      {searchable && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
              aria-label={searchLabel}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl neu-inset">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 ${col.className ?? ""}`}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 text-gray-700 dark:text-gray-200 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
