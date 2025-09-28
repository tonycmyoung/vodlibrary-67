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

  const getSortLabel = (value: string) => {
    switch (value) {
      case "full_name":
        return "Name"
      case "created_at":
        return "Joined Date"
      case "last_login":
        return "Last Login"
      case "login_count":
        return "Login Count"
      case "last_view":
        return "Last View"
      case "view_count":
        return "Views"
      default:
        return "Name"
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
          <SelectItem value="full_name" className="text-gray-300 hover:text-gray-900">
            Name
          </SelectItem>
          <SelectItem value="created_at" className="text-gray-300 hover:text-gray-900">
            Joined Date
          </SelectItem>
          <SelectItem value="last_login" className="text-gray-300 hover:text-gray-900">
            Last Login
          </SelectItem>
          <SelectItem value="login_count" className="text-gray-300 hover:text-gray-900">
            Login Count
          </SelectItem>
          <SelectItem value="last_view" className="text-gray-300 hover:text-gray-900">
            Last View
          </SelectItem>
          <SelectItem value="view_count" className="text-gray-300 hover:text-gray-900">
            Views
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
