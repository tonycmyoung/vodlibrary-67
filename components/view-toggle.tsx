"use client"

import { Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ViewToggleProps {
  view: "grid" | "list"
  onViewChange: (view: "grid" | "list") => void
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`px-3 py-2 ${
          view === "grid"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`}
      >
        <Grid className="w-4 h-4" />
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={`px-3 py-2 ${
          view === "list"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  )
}
