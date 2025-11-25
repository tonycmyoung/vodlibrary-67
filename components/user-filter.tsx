"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

interface UserFilterProps {
  roles: string[]
  schools: string[]
  belts?: Array<{ id: string; name: string; color: string }>
  selectedRole: string
  selectedSchool: string
  selectedBelt?: string
  onRoleChange: (role: string) => void
  onSchoolChange: (school: string) => void
  onBeltChange?: (belt: string) => void
  userCount: number
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

  const hasActiveFilters =
    (selectedRole && selectedRole !== "all") ||
    (selectedSchool && selectedSchool !== "all") ||
    (selectedBelt && selectedBelt !== "all")

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
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">Role:</span>
            <Select value={selectedRole} onValueChange={onRoleChange}>
              <SelectTrigger className="w-32 bg-black/50 border-gray-700 text-white">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-gray-300 hover:text-gray-900">
                  All Roles
                </SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role} className="text-gray-300 hover:text-gray-900">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* School Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">School:</span>
            <Select value={selectedSchool} onValueChange={onSchoolChange}>
              <SelectTrigger className="w-48 bg-black/50 border-gray-700 text-white">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-gray-300 hover:text-gray-900">
                  All Schools
                </SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school} className="text-gray-300 hover:text-gray-900">
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {belts && onBeltChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">Belt:</span>
              <Select value={selectedBelt || "all"} onValueChange={onBeltChange}>
                <SelectTrigger className="w-40 bg-black/50 border-gray-700 text-white">
                  <SelectValue placeholder="All Belts" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-gray-300 hover:text-gray-900">
                    All Belts
                  </SelectItem>
                  <SelectItem value="none" className="text-gray-300 hover:text-gray-900">
                    No Belt Set
                  </SelectItem>
                  {belts.map((belt) => (
                    <SelectItem key={belt.id} value={belt.id} className="text-gray-300 hover:text-gray-900">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: belt.color }} />
                        {belt.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedRole && selectedRole !== "all" && (
            <Badge
              variant="default"
              className="cursor-pointer bg-blue-600 text-white border-2 border-blue-600"
              onClick={() => onRoleChange("all")}
            >
              Role: {selectedRole}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {selectedSchool && selectedSchool !== "all" && (
            <Badge
              variant="default"
              className="cursor-pointer bg-green-600 text-white border-2 border-green-600"
              onClick={() => onSchoolChange("all")}
            >
              School: {selectedSchool}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {selectedBelt && selectedBelt !== "all" && onBeltChange && (
            <Badge
              variant="default"
              className="cursor-pointer bg-purple-600 text-white border-2 border-purple-600"
              onClick={() => onBeltChange("all")}
            >
              Belt: {selectedBelt === "none" ? "No Belt Set" : belts?.find((b) => b.id === selectedBelt)?.name}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      <div className="text-sm text-gray-400">
        {hasActiveFilters ? (
          <>
            Showing {userCount} user{userCount === 1 ? "" : "s"} matching:{" "}
            {
              [
                selectedRole !== "all" && "role",
                selectedSchool !== "all" && "school",
                selectedBelt && selectedBelt !== "all" && "belt",
              ].filter(Boolean).length
            }{" "}
            filter
            {[
              selectedRole !== "all" && "role",
              selectedSchool !== "all" && "school",
              selectedBelt && selectedBelt !== "all" && "belt",
            ].filter(Boolean).length === 1
              ? ""
              : "s"}
          </>
        ) : (
          <>
            Showing {userCount} user{userCount === 1 ? "" : "s"}
          </>
        )}
      </div>
    </div>
  )
}
