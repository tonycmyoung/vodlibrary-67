"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface PaginationControlsProps {
  totalPages: number
  itemsPerPage: number
  onItemsPerPageChange: (value: string) => void
  currentPage: number
  onPageChange: (page: number) => void
}

/**
 * Pagination controls with items per page selector and page navigation.
 * Displays First/Previous/Next/Last buttons with numbered page buttons.
 */
export default function PaginationControls({
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  onPageChange,
}: PaginationControlsProps) {
  const showNavigation = totalPages > 1

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-3 sm:py-3">
      <div className="flex flex-col flex-row items-start items-center justify-between gap-2 gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-gray-400">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
            <SelectTrigger className="w-20 bg-black/50 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-gray-700">
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-400">per page</span>
        </div>

        {showNavigation && (
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </Button>

            <PageNumbers
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Last
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Page number buttons with ellipsis for large page counts
 */
function PageNumbers({
  totalPages,
  currentPage,
  onPageChange,
}: {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const endPage = Math.min(totalPages, startPage + maxVisible - 1)

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  if (startPage > 1) {
    pages.push(
      <Button
        key={1}
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(1)}
        className="h-8 w-8 p-0 text-white hover:bg-gray-800"
      >
        1
      </Button>
    )
    if (startPage > 2) {
      pages.push(
        <span key={`ellipsis-${currentPage}-start`} className="px-2 text-gray-400">
          ...
        </span>
      )
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <Button
        key={i}
        variant={currentPage === i ? "default" : "ghost"}
        size="sm"
        onClick={() => onPageChange(i)}
        className={`h-8 w-8 p-0 ${
          currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "text-white hover:bg-gray-800"
        }`}
      >
        {i}
      </Button>
    )
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(
        <span key={`ellipsis-${currentPage}-end`} className="px-2 text-gray-400">
          ...
        </span>
      )
    }
    pages.push(
      <Button
        key={totalPages}
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        className="h-8 w-8 p-0 text-white hover:bg-gray-800"
      >
        {totalPages}
      </Button>
    )
  }

  return <>{pages}</>
}
