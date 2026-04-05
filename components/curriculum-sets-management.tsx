"use client"

// Curriculum Sets Management - manages curriculum sets and their belt levels
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, MoreVertical, ChevronUp, ChevronDown, Loader2, Film, X, Search } from "lucide-react"
import {
  getCurriculumSets,
  getCurriculumSetWithLevels,
  createCurriculumSet,
  updateCurriculumSet,
  deleteCurriculumSet,
} from "@/lib/actions/curriculums"
import { useToast } from "@/hooks/use-toast"
import { useLevelManagement } from "@/hooks/use-level-management"
import { VideoManagementPanel } from "@/components/video-management-panel"

interface LevelItemProps {
  level: CurriculumLevel
  index: number
  totalLevels: number
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
  onManageVideos: () => void
}

const LevelItem = ({ level, index, totalLevels, onMoveUp, onMoveDown, onEdit, onDelete, onManageVideos }: LevelItemProps) => (
  <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50 flex items-center justify-between">
    <div className="flex items-center gap-3 flex-1">
      <div
        className="w-6 h-6 rounded-full border border-gray-600"
        style={{ backgroundColor: level.color }}
        title={level.color}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white">{level.name}</p>
        {level.description && (
          <p className="text-xs text-gray-400 line-clamp-1">{level.description}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white" onClick={onMoveUp} disabled={index === 0}>
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white" onClick={onMoveDown} disabled={index === totalLevels - 1}>
        <ChevronDown className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
          <DropdownMenuItem onClick={onManageVideos} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
            <Film className="mr-2 h-4 w-4" /> Manage Videos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit} className="text-gray-200 hover:bg-gray-700 cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)

interface CurriculumSet {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface CurriculumLevel {
  id: string
  name: string
  description: string | null
  color: string
  display_order: number
  curriculum_set_id: string
}

interface CurriculumSetWithLevels extends CurriculumSet {
  levels: CurriculumLevel[]
}

interface VideoItem {
  id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number | null
}

const PRESET_COLORS = ["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB", "#7C3AED", "#DB2777", "#059669", "#0891B2", "#7C2D12"]

export default function CurriculumSetsManagement() {
  const { toast } = useToast()
  const [sets, setSets] = useState<CurriculumSet[]>([])
  const [selectedSet, setSelectedSet] = useState<CurriculumSetWithLevels | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState(false)
  const [isAddSetDialogOpen, setIsAddSetDialogOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<CurriculumSet | null>(null)
  const [setFormData, setSetFormData] = useState({ name: "", description: "" })
  const [managingVideosForLevel, setManagingVideosForLevel] = useState<CurriculumLevel | null>(null)

  const {
    editingLevel,
    setEditingLevel,
    levelFormData,
    setLevelFormData,
    savingSet: savingLevel,
    isAddLevelDialogOpen,
    setIsAddLevelDialogOpen,
    handleAddLevel,
    handleUpdateLevel,
    handleDeleteLevel,
    handleMoveLevel,
  } = useLevelManagement({
    selectedSetId: selectedSet?.id,
    PRESET_COLORS,
    onSuccess: async () => {
      if (selectedSet) await fetchSetDetails(selectedSet.id)
    },
  })

  // Helper to reduce cognitive complexity - handles success/error toasts
  const handleResult = (
    result: { success?: string; error?: string },
    onSuccess?: () => void
  ): boolean => {
    if (result.success) {
      toast({ title: "Success", description: result.success })
      onSuccess?.()
      return true
    }
    toast({ title: "Error", description: result.error, variant: "destructive" })
    return false
  }
    toast({ title: "Error", description: result.error, variant: "destructive" })
    return false
  }

  useEffect(() => {
    fetchSets()
  }, [])

  const fetchSets = async () => {
    try {
      setLoading(true)
      const data = await getCurriculumSets()
      setSets(data)
      if (data.length > 0 && !selectedSet) {
        await fetchSetDetails(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching curriculum sets:", error)
      toast({ title: "Error", description: "Failed to fetch curriculum sets", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchSetDetails = async (setId: string) => {
    try {
      const data = await getCurriculumSetWithLevels(setId)
      if (data) setSelectedSet(data)
    } catch (error) {
      console.error("Error fetching set details:", error)
    }
  }

  const handleAddSet = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setSavingSet(true)
    try {
      const result = await createCurriculumSet(setFormData)
      handleResult(result, async () => {
        await fetchSets()
        setSetFormData({ name: "", description: "" })
        setIsAddSetDialogOpen(false)
      })
    } catch (error) {
      console.error("Error adding set:", error)
      toast({ title: "Error", description: "Failed to add curriculum set", variant: "destructive" })
    } finally {
      setSavingSet(false)
    }
  }

  const handleUpdateSet = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!editingSet) return
    setSavingSet(true)
    try {
      const result = await updateCurriculumSet(editingSet.id, setFormData)
      handleResult(result, async () => {
        await fetchSets()
        await fetchSetDetails(editingSet.id)
        setEditingSet(null)
        setSetFormData({ name: "", description: "" })
        setIsAddSetDialogOpen(false)
      })
    } catch (error) {
      console.error("Error updating set:", error)
      toast({ title: "Error", description: "Failed to update curriculum set", variant: "destructive" })
    } finally {
      setSavingSet(false)
    }
  }

  const handleDeleteSet = async (setId: string) => {
    if (!globalThis.confirm("Are you sure? This will delete the curriculum set and all its levels.")) return
    try {
      const result = await deleteCurriculumSet(setId)
      handleResult(result, async () => {
        await fetchSets()
        setSelectedSet(null)
      })
    } catch (error) {
      console.error("Error deleting set:", error)
      toast({ title: "Error", description: "Failed to delete curriculum set", variant: "destructive" })
    }
  }

  const handleAddLevel = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!selectedSet) return
    await handleAddLevel(e)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-300">Loading curriculum sets...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Manage curriculum sets and their levels</p>
        <Dialog open={isAddSetDialogOpen} onOpenChange={setIsAddSetDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSet(null)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Curriculum Set
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSet ? "Edit" : "Create"} Curriculum Set</DialogTitle>
            </DialogHeader>
            <form onSubmit={editingSet ? handleUpdateSet : handleAddSet} className="space-y-4">
              <div>
                <label htmlFor="set-name" className="block text-sm font-medium mb-1">
                  Name
                </label>
                <Input
                  id="set-name"
                  placeholder="e.g., Okinawa Kobudo Australia"
                  value={setFormData.name}
                  onChange={(e) => setSetFormData({ ...setFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="set-description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  id="set-description"
                  placeholder="Describe this curriculum set..."
                  value={setFormData.description}
                  onChange={(e) => setSetFormData({ ...setFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddSetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSet || !setFormData.name}>
                  {savingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSet ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Sets List */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Curriculum Sets</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sets.length === 0 ? (
              <p className="text-sm text-gray-400">No curriculum sets yet</p>
            ) : (
              sets.map((set) => (
                <div
                  key={set.id}
                  className={`w-full p-3 rounded-lg border transition ${
                    selectedSet?.id === set.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => fetchSetDetails(set.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-medium text-sm text-white truncate">{set.name}</p>
                      {set.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{set.description}</p>
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingSet(set)
                            setSetFormData({ name: set.name, description: set.description || "" })
                            setIsAddSetDialogOpen(true)
                          }}
                          className="text-gray-200 hover:bg-gray-700 cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSet(set.id)}
                          className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Levels Management */}
        <div className="lg:col-span-2">
          {selectedSet ? (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedSet.name}</h3>
                  {selectedSet.description && (
                    <p className="text-sm text-gray-400 mt-1">{selectedSet.description}</p>
                  )}
                </div>
                <Dialog open={isAddLevelDialogOpen} onOpenChange={setIsAddLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingLevel(null)
                        setLevelFormData({ name: "", description: "", color: PRESET_COLORS[0] })
                      }}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Level
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">{editingLevel ? "Edit" : "Add"} Level</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editingLevel ? handleUpdateLevel : handleAddLevel} className="space-y-4">
                      <div>
                        <label htmlFor="level-name" className="block text-sm font-medium text-gray-200 mb-1">
                          Level Name
                        </label>
                        <Input
                          id="level-name"
                          placeholder="e.g., 1st Kyu"
                          value={levelFormData.name}
                          onChange={(e) => setLevelFormData({ ...levelFormData, name: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="level-description" className="block text-sm font-medium text-gray-200 mb-1">
                          Description
                        </label>
                        <Textarea
                          id="level-description"
                          placeholder="Describe this level..."
                          value={levelFormData.description}
                          onChange={(e) => setLevelFormData({ ...levelFormData, description: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label htmlFor="level-color" className="block text-sm font-medium text-gray-200 mb-2">
                          Color
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded border-2 transition ${
                                levelFormData.color === color ? "border-white" : "border-gray-600"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setLevelFormData({ ...levelFormData, color })}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddLevelDialogOpen(false)}
                          className="bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={savingSet || !levelFormData.name}
                          className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                        >
                          {savingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingLevel ? "Update" : "Add"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedSet.levels.length === 0 ? (
                  <p className="text-sm text-gray-400">No levels in this curriculum set</p>
                ) : (
                  selectedSet.levels.map((level, index) => (
                    <LevelItem
                      key={level.id}
                      level={level}
                      index={index}
                      totalLevels={selectedSet.levels.length}
                      onMoveUp={() => handleMoveLevel(selectedSet.levels, level, "up")}
                      onMoveDown={() => handleMoveLevel(selectedSet.levels, level, "down")}
                      onEdit={() => {
                        setEditingLevel(level)
                        setLevelFormData({
                          name: level.name,
                          description: level.description || "",
                          color: level.color,
                        })
                        setIsAddLevelDialogOpen(true)
                      }}
                      onDelete={() => handleDeleteLevel(level.id)}
                      onManageVideos={() => openVideoManagement(level)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <p className="text-center text-gray-400">Select a curriculum set to manage its levels</p>
            </div>
          )}
        </div>
      </div>

      {/* Video Management Panel */}
      <VideoManagementPanel
        level={managingVideosForLevel}
        onClose={() => setManagingVideosForLevel(null)}
      />
    </div>
  )
}
