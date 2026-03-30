"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

export interface SearchInputProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onClear: () => void
  readonly placeholder?: string
  readonly className?: string
}

/**
 * Search input with clear button.
 * Used for video search in the video library.
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search videos...",
  className = "",
}: Readonly<SearchInputProps>) {
  return (
    <div className={`relative flex-1 max-w-md w-full ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
