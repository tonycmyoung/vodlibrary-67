import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  addLevelToCurriculumSet,
  updateLevelInCurriculumSet,
  deleteLevelFromCurriculumSet,
  reorderLevelsInCurriculumSet,
} from "@/lib/actions/curriculums"

interface UseLevelManagementProps {
  selectedSetId?: string
  PRESET_COLORS: string[]
  onSuccess: () => Promise<void>
}

interface LevelFormData {
  name: string
  description: string
  color: string
}

export function useLevelManagement({ selectedSetId, PRESET_COLORS, onSuccess }: UseLevelManagementProps) {
  const { toast } = useToast()
  const [editingLevel, setEditingLevel] = useState<any>(null)
  const [levelFormData, setLevelFormData] = useState<LevelFormData>({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
  })
  const [savingSet, setSavingSet] = useState(false)
  const [isAddLevelDialogOpen, setIsAddLevelDialogOpen] = useState(false)

  const handleAddLevel = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!selectedSetId) return
    setSavingSet(true)
    try {
      const result = await addLevelToCurriculumSet(selectedSetId, levelFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await onSuccess()
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

  const handleUpdateLevel = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!editingLevel) return
    setSavingSet(true)
    try {
      const result = await updateLevelInCurriculumSet(editingLevel.id, levelFormData)
      if (result.success) {
        toast({ title: "Success", description: result.success })
        await onSuccess()
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
        await onSuccess()
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting level:", error)
      toast({ title: "Error", description: "Failed to delete level", variant: "destructive" })
    }
  }

  const handleMoveLevel = async (levels: any[], level: any, direction: "up" | "down") => {
    const currentIndex = levels.findIndex((l) => l.id === level.id)
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= levels.length) return

    const newOrder = [...levels]
    ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]

    try {
      if (!selectedSetId) return
      await reorderLevelsInCurriculumSet(
        selectedSetId,
        newOrder.map((l, idx) => ({ id: l.id, display_order: idx })),
      )
      await onSuccess()
      toast({ title: "Success", description: "Levels reordered successfully" })
    } catch (error) {
      console.error("Error reordering levels:", error)
      toast({ title: "Error", description: "Failed to reorder levels", variant: "destructive" })
    }
  }

  return {
    editingLevel,
    setEditingLevel,
    levelFormData,
    setLevelFormData,
    savingSet,
    isAddLevelDialogOpen,
    setIsAddLevelDialogOpen,
    handleAddLevel,
    handleUpdateLevel,
    handleDeleteLevel,
    handleMoveLevel,
  }
}
