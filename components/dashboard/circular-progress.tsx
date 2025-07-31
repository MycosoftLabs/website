"use client"

import type React from "react"

interface CircularProgressProps {
  value: number
  icon: React.ComponentType<any>
  label: string
}

export function CircularProgress({ value, icon: Icon, label }: CircularProgressProps) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            className="text-gray-800"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="48"
            cy="48"
          />
          <circle
            className="text-primary"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="48"
            cy="48"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{value}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export type { CircularProgressProps }
