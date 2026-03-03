"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Filter } from "lucide-react"
import CategoryFilter from "@/components/category-filter"

interface Category {
  id: string
  name: string
  color: string
  description: string | null
}

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
  description: string | null
}

interface Performer {
  id: string
  name: string
}

// Filter mode toggle component
const FilterModeToggle = ({
  filterMode,
  onFilterModeChange,
  showDescription = false,
}: {
  filterMode: "AND" | "OR"
  onFilterModeChange: (mode: "AND" | "OR") => void
  showDescription?: boolean
}) => (
  <div className="flex items-center gap-2">
    {showDescription && <span className="text-sm text-gray-400">Filter mode:</span>}
    {!showDescription && <span className="text-sm text-gray-400">Filter mode:</span>}
    <div className="flex rounded-md overflow-hidden border border-gray-700">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFilterModeChange("AND")}
        className={`rounded-none px-3 h-8 ${
          filterMode === "AND"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-700"
        }`}
      >
        AND
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFilterModeChange("OR")}
        className={`rounded-none px-3 h-8 ${
          filterMode === "OR"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-700"
        }`}
      >
        OR
      </Button>
    </div>
  </div>
)

// Filter section component
const FilterSection = ({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
}: {
  categories: Category[]
  recordedValues: string[]
  performers: Performer[]
  selectedCategories: string[]
  onCategoryToggle: (id: string) => void
  videoCount: number
  curriculums: Curriculum[]
  selectedCurriculums: string[]
  onCurriculumToggle: (id: string) => void
}) => (
  <div className="space-y-6">
    <CategoryFilter
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
  </div>
)

export interface MobileFilterDialogProps {
  showMobileFilters: boolean
  setShowMobileFilters: (show: boolean) => void
  categories: Category[]
  recordedValues: string[]
  performers: Performer[]
  selectedCategories: string[]
  onCategoryToggle: (id: string) => void
  videoCount: number
  curriculums: Curriculum[]
  selectedCurriculums: string[]
  onCurriculumToggle: (id: string) => void
  filterMode: "AND" | "OR"
  onFilterModeChange: (mode: "AND" | "OR") => void
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
}: MobileFilterDialogProps) {
  return (
    <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
      <DialogTrigger asChild>
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
            onClick={() => setShowMobileFilters(false)}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
