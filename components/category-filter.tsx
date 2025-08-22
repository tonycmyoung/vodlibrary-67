"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

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
}

export default function CategoryFilter({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
}: CategoryFilterProps) {
  const clearAllFilters = () => {
    selectedCategories.forEach((categoryId) => {
      onCategoryToggle(categoryId)
    })
  }

  const filterItems: FilterItem[] = [
    ...categories.map((cat) => ({ ...cat, type: "category" as const })),
    ...performers.map((performer) => ({
      id: `performer:${performer.id}`,
      name: performer.name,
      color: "#a855f7", // Purple color for performers
      type: "performer" as const,
    })),
    ...recordedValues
      .filter((value) => value && value !== "Unset")
      .map((value) => ({
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
              className={`cursor-pointer transition-all hover:scale-105 ${
                isSelected
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-transparent text-gray-300 border-gray-600 hover:border-red-500 hover:text-white"
              }`}
              style={
                isSelected
                  ? { backgroundColor: item.color, borderColor: item.color }
                  : { borderColor: item.color + "40" }
              }
              onClick={() => onCategoryToggle(item.id)}
            >
              {item.name}
            </Badge>
          )
        })}
      </div>

      {selectedCategories.length > 0 && (
        <div className="text-sm text-gray-400">
          Showing videos matching: {selectedCategories.length} filter{selectedCategories.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  )
}
