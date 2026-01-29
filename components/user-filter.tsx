"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

interface Belt {
  id: string
  name: string
  color: string
}

interface UserFilterProps {
  roles: string[]
  schools: string[]
  belts?: Belt[]
  selectedRole: string
  selectedSchool: string
  selectedBelt?: string
  onRoleChange: (role: string) => void
  onSchoolChange: (school: string) => void
  onBeltChange?: (belt: string) => void
  userCount: number
}

// Helper to check if a filter value is active
const isFilterActive = (value: string | undefined): boolean => Boolean(value && value !== "all")

// Helper to count active filters
const countActiveFilters = (role: string, school: string, belt?: string): number => {
  return [isFilterActive(role), isFilterActive(school), isFilterActive(belt)].filter(Boolean).length
}

// Helper to get belt display name
const getBeltDisplayName = (beltId: string, belts?: Belt[]): string => {
  if (beltId === "none") return "No Belt Set"
  return belts?.find((b) => b.id === beltId)?.name ?? beltId
}

// Filter select component - extracted to reduce complexity
const FilterSelect = ({
  label,
  value,
  onChange,
  placeholder,
  options,
  width,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: Array<{ value: string; label: string; color?: string }>
  width: string
}) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-400 whitespace-nowrap">{label}:</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${width} bg-black/50 border-gray-700 text-white`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-700">
        <SelectItem value="all" className="text-gray-300 hover:text-gray-900">
          {placeholder}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-gray-300 hover:text-gray-900">
            {option.color ? (
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: option.color }} />
                {option.label}
              </span>
            ) : (
              option.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

// Filter badge component - extracted to reduce complexity
const FilterBadge = ({
  label,
  value,
  onClear,
  colorClass,
}: {
  label: string
  value: string
  onClear: () => void
  colorClass: string
}) => (
  <Badge variant="default" className={`cursor-pointer ${colorClass} text-white border-2 ${colorClass}`} onClick={onClear}>
    {label}: {value}
    <X className="w-3 h-3 ml-1" />
  </Badge>
)

// User count display component - extracted to reduce complexity
const UserCountDisplay = ({ count, filterCount }: { count: number; filterCount: number }) => {
  const userText = count === 1 ? "user" : "users"
  const filterText = filterCount === 1 ? "filter" : "filters"

  if (filterCount > 0) {
    return (
      <div className="text-sm text-gray-400">
        Showing {count} {userText} matching: {filterCount} {filterText}
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-400">
      Showing {count} {userText}
    </div>
  )
}

export default function UserFilter({
  roles,
  schools,
  belts,
  selectedRole,
  selectedSchool,
  selectedBelt,
  onRoleChange,
  onSchoolChange,
  onBeltChange,
  userCount,
}: UserFilterProps) {
  const clearAllFilters = () => {
    onRoleChange("all")
    onSchoolChange("all")
    onBeltChange?.("all")
  }

  const hasActiveFilters = isFilterActive(selectedRole) || isFilterActive(selectedSchool) || isFilterActive(selectedBelt)
  const activeFilterCount = countActiveFilters(selectedRole, selectedSchool, selectedBelt)

  const roleOptions = roles.map((role) => ({ value: role, label: role }))
  const schoolOptions = schools.map((school) => ({ value: school, label: school }))
  const beltOptions = belts
    ? [{ value: "none", label: "No Belt Set" }, ...belts.map((belt) => ({ value: belt.id, label: belt.name, color: belt.color }))]
    : []

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center justify-between sm:justify-start">
          <h3 className="text-lg font-semibold text-white whitespace-nowrap">Filter by</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-400 hover:text-white sm:ml-4"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Role"
            value={selectedRole}
            onChange={onRoleChange}
            placeholder="All Roles"
            options={roleOptions}
            width="w-32"
          />
          <FilterSelect
            label="School"
            value={selectedSchool}
            onChange={onSchoolChange}
            placeholder="All Schools"
            options={schoolOptions}
            width="w-48"
          />
          {belts && onBeltChange && (
            <FilterSelect
              label="Belt"
              value={selectedBelt || "all"}
              onChange={onBeltChange}
              placeholder="All Belts"
              options={beltOptions}
              width="w-40"
            />
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {isFilterActive(selectedRole) && (
            <FilterBadge label="Role" value={selectedRole} onClear={() => onRoleChange("all")} colorClass="bg-blue-600 border-blue-600" />
          )}
          {isFilterActive(selectedSchool) && (
            <FilterBadge label="School" value={selectedSchool} onClear={() => onSchoolChange("all")} colorClass="bg-green-600 border-green-600" />
          )}
          {isFilterActive(selectedBelt) && onBeltChange && (
            <FilterBadge
              label="Belt"
              value={getBeltDisplayName(selectedBelt!, belts)}
              onClear={() => onBeltChange("all")}
              colorClass="bg-purple-600 border-purple-600"
            />
          )}
        </div>
      )}

      <UserCountDisplay count={userCount} filterCount={activeFilterCount} />
    </div>
  )
}
