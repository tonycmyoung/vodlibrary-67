"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategories: string[]
  onCategoryToggle: (categoryId: string) => void
}

export default function CategoryFilter({ categories, selectedCategories, onCategoryToggle }: CategoryFilterProps) {
  const clearAllFilters = () => {
    selectedCategories.forEach((categoryId) => {
      onCategoryToggle(categoryId)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Filter by Category</h3>
        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.id)
          return (
            <Badge
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-all hover:scale-105 ${
                isSelected
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-transparent text-gray-300 border-gray-600 hover:border-red-500 hover:text-white"
              }`}
              style={
                isSelected
                  ? { backgroundColor: category.color, borderColor: category.color }
                  : { borderColor: category.color + "40" }
              }
              onClick={() => onCategoryToggle(category.id)}
            >
              {category.name}
            </Badge>
          )
        })}
      </div>

      {selectedCategories.length > 0 && (
        <div className="text-sm text-gray-400">
          Showing videos in: {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"}
        </div>
      )}
    </div>
  )
}
