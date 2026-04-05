"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, MoreVertical, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import {
  getCurriculumSets,
  getCurriculumSetWithLevels,
  createCurriculumSet,
  updateCurriculumSet,
  deleteCurriculumSet,
  addLevelToCurriculumSet,
  updateLevelInCurriculumSet,
  deleteLevelFromCurriculumSet,
  reorderLevelsInCurriculumSet,
} from "@/lib/actions/curriculums"
import { useToast } from "@/hooks/use-toast"

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

const PRESET_COLORS = ["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB", "#7C3AED", "#DB2777", "#059669", "#0891B2", "#7C2D12"]

export default function CurriculumSetsManagement() {
  const { toast } = useToast()
  const [sets, setSets] = useState<CurriculumSet[]>([])
  const [selectedSet, setSelectedSet] = useState<CurriculumSetWithLevels | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingSet, setSavingSet] = useState(false)
  const [isAddSetDialogOpen, setIsAddSetDialogOpen] = useState(false)
  const [isAddLevelDialogOpen, setIsAddLevelDialogOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<CurriculumSet | null>(null)
  const [editingLevel, setEditingLevel] = useState<CurriculumLevel | null>(null)
  const [setFormData, setSetFormData] = useState({ name: "", description: "" })
  const [levelFormData, setLevelFormData] = useState({ name: "", description: "", color: PRESET_COLORS[0] })

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

  const handleAddSet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingSet(true)
    try {
      const result = await createCurriculumSet(setFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await fetchSets()
        setSetFormData({ name: "", description: "" })
        setIsAddSetDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error adding set:", error)
      toast({ title: "Error", description: "Failed to add curriculum set", variant: "destructive" })
    } finally {
      setSavingSet(false)
    }
  }

  const handleUpdateSet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingSet) return
    setSavingSet(true)
    try {
      const result = await updateCurriculumSet(editingSet.id, setFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await fetchSets()
        await fetchSetDetails(editingSet.id)
        setEditingSet(null)
        setSetFormData({ name: "", description: "" })
        setIsAddSetDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
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
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await fetchSets()
        setSelectedSet(null)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting set:", error)
      toast({ title: "Error", description: "Failed to delete curriculum set", variant: "destructive" })
    }
  }

  const handleAddLevel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedSet) return
    setSavingSet(true)
    try {
      const result = await addLevelToCurriculumSet(selectedSet.id, levelFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await fetchSetDetails(selectedSet.id)
        setLevelFormData({ name: "", description: "", color: PRESET_COLORS[0] })
        setIsAddLevelDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error adding level:", error)
      toast({ title: "Error", description: "Failed to add level", variant: "destructive" })
    } finally {
      setSavingSet(false)
    }
  }

  const handleUpdateLevel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLevel) return
    setSavingSet(true)
    try {
      const result = await updateLevelInCurriculumSet(editingLevel.id, levelFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        if (selectedSet) await fetchSetDetails(selectedSet.id)
        setEditingLevel(null)
        setLevelFormData({ name: "", description: "", color: PRESET_COLORS[0] })
        setIsAddLevelDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error updating level:", error)
      toast({ title: "Error", description: "Failed to update level", variant: "destructive" })
    } finally {
      setSavingSet(false)
    }
  }

  const handleDeleteLevel = async (levelId: string) => {
    if (!globalThis.confirm("Are you sure? This level will be deleted.")) return
    try {
      const result = await deleteLevelFromCurriculumSet(levelId)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        if (selectedSet) await fetchSetDetails(selectedSet.id)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting level:", error)
      toast({ title: "Error", description: "Failed to delete level", variant: "destructive" })
    }
  }

  const handleMoveLevel = async (level: CurriculumLevel, direction: "up" | "down") => {
    if (!selectedSet) return
    const levels = selectedSet.levels
    const currentIndex = levels.findIndex((l) => l.id === level.id)
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= levels.length) return

    const newOrder = [...levels]
    ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]

    try {
      await reorderLevelsInCurriculumSet(
        selectedSet.id,
        newOrder.map((l, idx) => ({ id: l.id, display_order: idx })),
      )
      await fetchSetDetails(selectedSet.id)
      toast({ title: "Success", description: "Levels reordered successfully" })
    } catch (error) {
      console.error("Error reordering levels:", error)
      toast({ title: "Error", description: "Failed to reorder levels", variant: "destructive" })
    }
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
                <button
                  key={set.id}
                  type="button"
                  onClick={() => fetchSetDetails(set.id)}
                  className={`w-full text-left p-3 rounded-lg cursor-pointer border transition ${
                    selectedSet?.id === set.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{set.name}</p>
                      {set.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{set.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                </button>
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
                    <div key={level.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/50 flex items-center justify-between">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          onClick={() => handleMoveLevel(level, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          onClick={() => handleMoveLevel(level, "down")}
                          disabled={index === selectedSet.levels.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingLevel(level)
                                setLevelFormData({
                                  name: level.name,
                                  description: level.description || "",
                                  color: level.color,
                                })
                                setIsAddLevelDialogOpen(true)
                              }}
                              className="text-gray-200 hover:bg-gray-700 cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteLevel(level.id)}
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
          ) : (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <p className="text-center text-gray-400">Select a curriculum set to manage its levels</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
