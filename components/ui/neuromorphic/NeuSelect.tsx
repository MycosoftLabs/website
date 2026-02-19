"use client"

/**
 * Neuromorphic Select / Dropdown component
 * Searchable single-select dropdown with neuromorphic styling.
 * Date: Feb 18, 2026
 */

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { ChevronDown } from "lucide-react"

export interface NeuSelectOption {
  value: string
  label: string
}

export interface NeuSelectProps {
  options: NeuSelectOption[]
  value?: string
  onChange?: (value: string, option: NeuSelectOption) => void
  placeholder?: string
  label?: string
  searchPlaceholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

export function NeuSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  searchPlaceholder = "Search...",
  id = "neu-select",
  className = "",
  disabled = false,
}: NeuSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )
  const selectedOption = options.find((o) => o.value === value || o.label === value)
  const displayValue = search || (selectedOption?.label ?? "")

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("click", handleClickOutside)
    return () => window.removeEventListener("click", handleClickOutside)
  }, [])

  const handleSelect = (opt: NeuSelectOption) => {
    onChange?.(opt.value, opt)
    setSearch("")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          id={id}
          placeholder={placeholder}
          autoComplete="off"
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value && selectedOption) {
              onChange?.("", { value: "", label: "" })
            }
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-list`}
          className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <ChevronDown className="w-[18px] h-[18px]" aria-hidden />
        </span>
      </div>
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label={label ?? "Options"}
        className={`absolute z-20 w-full mt-2 rounded-xl overflow-hidden transition-all duration-200 neu-raised max-h-48 overflow-y-auto neu-custom-scrollbar ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
      >
        {filtered.map((opt) => (
          <li
            key={opt.value}
            role="option"
            tabIndex={-1}
            className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
            onClick={() => handleSelect(opt)}
          >
            {opt.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
