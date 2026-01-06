"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown } from "lucide-react"

interface UserSortControlProps {
  sortBy: string
  sortOrder: "asc" | "desc"
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void
}

export default function UserSortControl({ sortBy, sortOrder, onSortChange }: UserSortControlProps) {
  const handleSortByChange = (newSortBy: string) => {
    onSortChange(newSortBy, sortOrder)
  }

  const handleSortOrderToggle = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc"
    onSortChange(sortBy, newSortOrder)
  }

  const options = [
    { value: "full_name", label: "Name" },
    { value: "created_at", label: "Joined Date" },
    { value: "last_login", label: "Last Login" },
    { value: "last_view", label: "Last View" },
    { value: "view_count", label: "View Count" },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Sort by:</span>
      <Select value={sortBy} onValueChange={handleSortByChange}>
        <SelectTrigger className="w-32 bg-black/50 border-gray-700 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-gray-300 hover:text-gray-900">
              {option.label}
            </SelectItem>
          ))}
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
