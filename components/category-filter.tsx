"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "")

  // Convert to RGB
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? "#000000" : "#ffffff"
}

interface Category {
  id: string
  name: string
  color: string
}

interface Performer {
  id: string
  name: string
}

interface FilterItem {
  id: string
  name: string
  color: string
  type: "category" | "recorded" | "performer"
}

interface CategoryFilterProps {
  categories: Category[]
  recordedValues: string[]
  performers: Performer[]
  selectedCategories: string[]
  onCategoryToggle: (categoryId: string) => void
  videoCount: number
}

export default function CategoryFilter({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
}: CategoryFilterProps) {
  const clearAllFilters = () => {
    selectedCategories.forEach((categoryId) => {
      onCategoryToggle(categoryId)
    })
  }

  const sortedRecordedValues = recordedValues
    .filter((value) => value && value !== "Unset")
    .sort((a, b) => {
      const aIsYear = /^\d{4}$/.test(a)
      const bIsYear = /^\d{4}$/.test(b)

      if (aIsYear && bIsYear) {
        return Number.parseInt(a) - Number.parseInt(b) // Years in chronological order
      } else if (aIsYear && !bIsYear) {
        return -1 // Years come before non-years
      } else if (!aIsYear && bIsYear) {
        return 1 // Non-years come after years
      } else {
        return a.localeCompare(b) // Non-years in alphabetical order
      }
    })

  const filterItems: FilterItem[] = [
    ...categories.map((cat) => ({ ...cat, type: "category" as const })),
    ...performers.map((performer) => ({
      id: `performer:${performer.id}`,
      name: performer.name,
      color: "#a855f7", // Purple color for performers
      type: "performer" as const,
    })),
    ...sortedRecordedValues.map((value) => ({
      id: `recorded:${value}`,
      name: value, // Removed "Recorded: " prefix for consistency
      color: "#6b7280", // Gray color for recorded values
      type: "recorded" as const,
    })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Filter by</h3>
        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterItems.map((item) => {
          const isSelected = selectedCategories.includes(item.id)
          return (
            <Badge
              key={item.id}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-all hover:scale-105 relative ${
                isSelected
                  ? "text-white border-2 shadow-lg"
                  : "bg-gray-800/40 text-gray-100 border-2 hover:border-2 hover:text-white hover:bg-gray-700/60"
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: item.color,
                      borderColor: item.color,
                      color: getContrastColor(item.color),
                    }
                  : {
                      borderColor: item.color + "90", // Increased opacity from 70 to 90
                      borderLeftColor: item.color,
                      borderLeftWidth: "4px", // Increased from 3px to 4px
                    }
              }
              onClick={() => onCategoryToggle(item.id)}
            >
              {item.name}
            </Badge>
          )
        })}
      </div>

      <div className="text-sm text-gray-400">
        {selectedCategories.length > 0 ? (
          <>
            Showing {videoCount} video{videoCount === 1 ? "" : "s"} matching: {selectedCategories.length} filter
            {selectedCategories.length === 1 ? "" : "s"}
          </>
        ) : (
          <>
            Showing {videoCount} video{videoCount === 1 ? "" : "s"}
          </>
        )}
      </div>
    </div>
  )
}
