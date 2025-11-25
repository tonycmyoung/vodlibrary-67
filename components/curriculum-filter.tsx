"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "")
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "#000000" : "#ffffff"
}

function addTransparency(color: string, alpha: string): string | null {
  if (!color || !color.startsWith("#") || color.length < 7) {
    return null
  }
  return color + alpha
}

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
  description?: string | null
}

interface CurriculumFilterProps {
  curriculums: Curriculum[]
  selectedCurriculums: string[]
  onCurriculumToggle: (curriculumId: string) => void
}

export default function CurriculumFilter({
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
}: CurriculumFilterProps) {
  // Sort by display_order
  const sortedCurriculums = [...curriculums].sort((a, b) => a.display_order - b.display_order)

  if (sortedCurriculums.length === 0) return null

  return (
    <TooltipProvider>
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">CURRICULUM</div>
        <div className="flex flex-wrap gap-2">
          {sortedCurriculums.map((item) => {
            const isSelected = selectedCurriculums.includes(item.id)
            const hasValidColor = item.color && item.color.startsWith("#") && item.color.length >= 7

            const badge = (
              <Badge
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
                onClick={() => onCurriculumToggle(item.id)}
              >
                {item.name}
              </Badge>
            )

            if (item.description) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{badge}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {item.description}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.id}>{badge}</div>
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
