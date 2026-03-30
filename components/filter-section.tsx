"use client"

import CategoryFilter from "@/components/category-filter"
import type { Category, Curriculum, Performer } from "@/types/video"

export interface FilterSectionProps {
  readonly categories: Category[]
  readonly recordedValues: string[]
  readonly performers: Performer[]
  readonly selectedCategories: string[]
  readonly onCategoryToggle: (id: string) => void
  readonly videoCount: number
  readonly curriculums: Curriculum[]
  readonly selectedCurriculums: string[]
  readonly onCurriculumToggle: (id: string) => void
}

/**
 * Wrapper component for CategoryFilter.
 * Used in both desktop sidebar and mobile filter dialog.
 */
export default function FilterSection({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
}: FilterSectionProps) {
  return (
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
}
