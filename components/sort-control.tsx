"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown } from "lucide-react"

interface SortControlProps {
  sortBy: string
  sortOrder: "asc" | "desc"
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void
}

export default function SortControl({ sortBy, sortOrder, onSortChange }: SortControlProps) {
  const handleSortByChange = (newSortBy: string) => {
    onSortChange(newSortBy, sortOrder)
  }

  const handleSortOrderToggle = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc"
    onSortChange(sortBy, newSortOrder)
  }

  const getSortLabel = (value: string) => {
    switch (value) {
      case "curriculum":
        return "Curriculum"
      case "category":
        return "Category"
      case "title":
        return "Name"
      case "created_at":
        return "Added Date"
      case "recorded":
        return "Recorded"
      case "views":
        return "Views"
      case "last_viewed_at":
        return "Last View"
      default:
        return "Category"
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Sort by:</span>
      <Select value={sortBy} onValueChange={handleSortByChange}>
        <SelectTrigger className="w-32 bg-black/50 border-gray-700 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          <SelectItem value="curriculum" className="text-gray-300 hover:text-gray-900">
            Curriculum
          </SelectItem>
          <SelectItem value="category" className="text-gray-300 hover:text-gray-900">
            Category
          </SelectItem>
          <SelectItem value="title" className="text-gray-300 hover:text-gray-900">
            Name
          </SelectItem>
          <SelectItem value="created_at" className="text-gray-300 hover:text-gray-900">
            Added Date
          </SelectItem>
          <SelectItem value="recorded" className="text-gray-300 hover:text-gray-900">
            Recorded
          </SelectItem>
          <SelectItem value="views" className="text-gray-300 hover:text-gray-900">
            Views
          </SelectItem>
          <SelectItem value="last_viewed_at" className="text-gray-300 hover:text-gray-900">
            Last View
          </SelectItem>
        </SelectContent>
      </Select>
      <button
        onClick={handleSortOrderToggle}
        className="p-2 bg-black/50 border border-gray-700 rounded-md hover:bg-gray-800 transition-colors"
        title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
      >
        <ArrowUpDown
          className={`w-4 h-4 text-gray-400 ${sortOrder === "desc" ? "rotate-180" : ""} transition-transform`}
        />
      </button>
    </div>
  )
}
