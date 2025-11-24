"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import CurriculumFilter from "./curriculum-filter"

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

function addTransparency(color: string, alpha: string): string | null {
  if (!color || !color.startsWith("#") || color.length < 7) {
    return null
  }
  return color + alpha
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
  curriculums?: Array<{ id: string; name: string; color: string; display_order: number }>
  selectedCurriculums?: string[]
  onCurriculumToggle?: (curriculumId: string) => void
}

export default function CategoryFilter({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums = [],
  selectedCurriculums = [],
  onCurriculumToggle,
}: CategoryFilterProps) {
  const clearAllFilters = () => {
    selectedCategories.forEach((categoryId) => {
      onCategoryToggle(categoryId)
    })
    selectedCurriculums.forEach((curriculumId) => {
      onCurriculumToggle?.(curriculumId)
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

  const weaponCategories = categories.filter((cat) => !/^\d/.test(cat.name))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Filter by</h3>
        {(selectedCategories.length > 0 || selectedCurriculums.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {curriculums.length > 0 && onCurriculumToggle && (
          <CurriculumFilter
            curriculums={curriculums}
            selectedCurriculums={selectedCurriculums}
            onCurriculumToggle={onCurriculumToggle}
          />
        )}

        {/* Weapons Section */}
        {weaponCategories.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">WEAPONS</div>
            <div className="flex flex-wrap gap-2">
              {weaponCategories.map((item) => {
                const isSelected = selectedCategories.includes(item.id)
                const hasValidColor = item.color && item.color.startsWith("#") && item.color.length >= 7
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
                      hasValidColor
                        ? isSelected
                          ? {
                              backgroundColor: item.color,
                              borderColor: item.color,
                              color: getContrastColor(item.color),
                            }
                          : {
                              borderColor: addTransparency(item.color, "90") || item.color,
                              borderLeftColor: item.color,
                              borderLeftWidth: "4px",
                            }
                        : undefined
                    }
                    onClick={() => onCategoryToggle(item.id)}
                  >
                    {item.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Performers Section */}
        {performers.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">PERFORMERS</div>
            <div className="flex flex-wrap gap-2">
              {performers.map((performer) => {
                const item = {
                  id: `performer:${performer.id}`,
                  name: performer.name,
                  color: "#a855f7",
                }
                const isSelected = selectedCategories.includes(item.id)
                const hasValidColor = item.color && item.color.startsWith("#") && item.color.length >= 7
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
                      hasValidColor
                        ? isSelected
                          ? {
                              backgroundColor: item.color,
                              borderColor: item.color,
                              color: getContrastColor(item.color),
                            }
                          : {
                              borderColor: addTransparency(item.color, "90") || item.color,
                              borderLeftColor: item.color,
                              borderLeftWidth: "4px",
                            }
                        : undefined
                    }
                    onClick={() => onCategoryToggle(item.id)}
                  >
                    {item.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Recorded Section */}
        {sortedRecordedValues.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">RECORDED</div>
            <div className="flex flex-wrap gap-2">
              {sortedRecordedValues.map((value) => {
                const item = {
                  id: `recorded:${value}`,
                  name: value,
                  color: "#6b7280",
                }
                const isSelected = selectedCategories.includes(item.id)
                const hasValidColor = item.color && item.color.startsWith("#") && item.color.length >= 7
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
                      hasValidColor
                        ? isSelected
                          ? {
                              backgroundColor: item.color,
                              borderColor: item.color,
                              color: getContrastColor(item.color),
                            }
                          : {
                              borderColor: addTransparency(item.color, "90") || item.color,
                              borderLeftColor: item.color,
                              borderLeftWidth: "4px",
                            }
                        : undefined
                    }
                    onClick={() => onCategoryToggle(item.id)}
                  >
                    {item.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-400">
        {selectedCategories.length > 0 || selectedCurriculums.length > 0 ? (
          <>
            Showing {videoCount} video{videoCount === 1 ? "" : "s"} matching:{" "}
            {selectedCategories.length + selectedCurriculums.length} filter
            {selectedCategories.length + selectedCurriculums.length === 1 ? "" : "s"}
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
