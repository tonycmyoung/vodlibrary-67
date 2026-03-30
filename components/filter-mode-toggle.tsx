"use client"

import { Button } from "@/components/ui/button"
import type { FilterMode } from "@/types/video"

export interface FilterModeToggleProps {
  readonly filterMode: FilterMode
  readonly onFilterModeChange: (mode: FilterMode) => void
  readonly showDescription?: boolean
}

/**
 * Toggle component for switching between AND/OR filter modes.
 * Used in both desktop filter sidebar and mobile filter dialog.
 */
export default function FilterModeToggle({
  filterMode,
  onFilterModeChange,
  showDescription = false,
}: FilterModeToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${showDescription ? "mt-4" : ""}`}>
      <span className="text-sm text-gray-400">Filter mode:</span>
      <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
        <Button
          variant={filterMode === "AND" ? "default" : "ghost"}
          size="sm"
          onClick={() => onFilterModeChange("AND")}
          className={`text-xs px-3 py-1 ${
            filterMode === "AND"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          AND
        </Button>
        <Button
          variant={filterMode === "OR" ? "default" : "ghost"}
          size="sm"
          onClick={() => onFilterModeChange("OR")}
          className={`text-xs px-3 py-1 ${
            filterMode === "OR"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          OR
        </Button>
      </div>
      {showDescription && (
        <span className="text-xs text-gray-500">
          {filterMode === "AND"
            ? "Videos must have ALL selected categories/curriculums"
            : "Videos can have ANY selected categories/curriculums"}
        </span>
      )}
    </div>
  )
}
