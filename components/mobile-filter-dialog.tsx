"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Filter } from "lucide-react"
import FilterSection from "@/components/filter-section"
import FilterModeToggle from "@/components/filter-mode-toggle"
import type { Category, Curriculum, Performer, FilterMode } from "@/types/video"

export interface MobileFilterDialogProps {
  readonly showMobileFilters: boolean
  readonly setShowMobileFilters: (show: boolean) => void
  readonly categories: Category[]
  readonly recordedValues: string[]
  readonly performers: Performer[]
  readonly selectedCategories: string[]
  readonly onCategoryToggle: (id: string) => void
  readonly videoCount: number
  readonly curriculums: Curriculum[]
  readonly selectedCurriculums: string[]
  readonly onCurriculumToggle: (id: string) => void
  readonly filterMode: FilterMode
  readonly onFilterModeChange: (mode: FilterMode) => void
  /** Called when user clicks Apply to commit pending URL changes */
  readonly onApplyFilters?: () => void
}

export default function MobileFilterDialog({
  showMobileFilters,
  setShowMobileFilters,
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
  filterMode,
  onFilterModeChange,
  onApplyFilters,
}: MobileFilterDialogProps) {
  const handleApply = () => {
    // Commit any pending URL changes before closing
    onApplyFilters?.()
    setShowMobileFilters(false)
  }
  return (
    <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
      <DialogTrigger asChild data-testid="dialog-trigger">
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden bg-black/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {(selectedCategories.length > 0 || selectedCurriculums.length > 0) && (
            <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
              {selectedCategories.length + selectedCurriculums.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Filter Videos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FilterSection
            categories={categories}
            recordedValues={recordedValues}
            performers={performers}
            selectedCategories={selectedCategories}
            onCategoryToggle={onCategoryToggle}
            videoCount={videoCount}
            curriculums={curriculums}
            selectedCurriculums={selectedCurriculums}
            onCurriculumToggle={onCurriculumToggle}
          />
          {selectedCategories.length + selectedCurriculums.length > 1 && (
            <FilterModeToggle filterMode={filterMode} onFilterModeChange={onFilterModeChange} />
          )}
          <Button
            onClick={handleApply}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
