"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Loader2,
} from "lucide-react"
import {
  getCurriculums,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurriculums,
} from "@/lib/actions/curriculums"

interface Curriculum {
  id: string
  name: string
  description: string | null
  color: string
  display_order: number
  created_at: string
  video_count?: number
}

const PRESET_COLORS = [
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#059669",
  "#0891B2",
  "#7C2D12",
]

export default function CurriculumManagement() {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
  })

  useEffect(() => {
    fetchCurriculums()
  }, [])

  const fetchCurriculums = async () => {
    try {
      const data = await getCurriculums()
      setCurriculums(data)
    } catch (error) {
      console.error("Error fetching curriculums:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", color: PRESET_COLORS[0] })
    setEditingCurriculum(null)
  }

  const handleDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingCurriculum) {
        await updateCurriculum(editingCurriculum.id, {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
        })
      } else {
        await addCurriculum({
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
        })
      }

      await fetchCurriculums()
      handleDialogChange(false)
    } catch (error) {
      console.error("Error saving curriculum:", error)
    }
  }

  const handleEdit = (curriculum: Curriculum) => {
    setEditingCurriculum(curriculum)
    setFormData({
      name: curriculum.name,
      description: curriculum.description || "",
      color: curriculum.color,
    })
    handleDialogChange(true)
  }

  const handleDelete = async (curriculumId: string) => {
    if (!globalThis.confirm("Are you sure you want to delete this curriculum? This will remove it from all videos.")) return

    try {
      await deleteCurriculum(curriculumId)
      await fetchCurriculums()
    } catch (error) {
      console.error("Error deleting curriculum:", error)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const newOrder = [...curriculums]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]

    const reorderData = newOrder.map((curriculum, idx) => ({
      id: curriculum.id,
      display_order: idx,
    }))

    setCurriculums(newOrder)
    await reorderCurriculums(reorderData)
  }

  const handleMoveDown = async (index: number) => {
    if (index === curriculums.length - 1) return

    const newOrder = [...curriculums]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]

    const reorderData = newOrder.map((curriculum, idx) => ({
      id: curriculum.id,
      display_order: idx,
    }))

    setCurriculums(newOrder)
    await reorderCurriculums(reorderData)
  }

  const handleMoveToTop = async (index: number) => {
    if (index === 0) return

    const newOrder = [...curriculums]
    const [item] = newOrder.splice(index, 1)
    newOrder.unshift(item)

    const reorderData = newOrder.map((curriculum, idx) => ({
      id: curriculum.id,
      display_order: idx,
    }))

    setCurriculums(newOrder)
    await reorderCurriculums(reorderData)
  }

  const handleMoveToBottom = async (index: number) => {
    if (index === curriculums.length - 1) return

    const newOrder = [...curriculums]
    const [item] = newOrder.splice(index, 1)
    newOrder.push(item)

    const reorderData = newOrder.map((curriculum, idx) => ({
      id: curriculum.id,
      display_order: idx,
    }))

    setCurriculums(newOrder)
    await reorderCurriculums(reorderData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-300">Loading curriculums...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Manage grade curriculum progression ({curriculums.length} items)</p>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Curriculum
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>{editingCurriculum ? "Edit Curriculum" : "Add New Curriculum"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="curriculum-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <Input
                  id="curriculum-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="curriculum-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  id="curriculum-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="curriculum-color-picker" className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div id="curriculum-color-picker" className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-10 h-10 rounded-lg border-2 ${
                        formData.color === color ? "border-white" : "border-gray-600"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                  {editingCurriculum ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {curriculums.map((curriculum, index) => (
          <Card
            key={curriculum.id}
            className="bg-black/40 border-gray-700 hover:border-purple-500/50 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-purple-600/50 text-gray-300 hover:text-white"
                      title="Reorder"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700 text-white">
                    <DropdownMenuItem
                      onClick={() => handleMoveToTop(index)}
                      disabled={index === 0}
                      className="hover:bg-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronsUp className="w-4 h-4 mr-2" />
                      Move to Top
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="hover:bg-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Move Up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveDown(index)}
                      disabled={index === curriculums.length - 1}
                      className="hover:bg-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Move Down
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveToBottom(index)}
                      disabled={index === curriculums.length - 1}
                      className="hover:bg-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronsDown className="w-4 h-4 mr-2" />
                      Move to Bottom
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: curriculum.color }} />

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">{curriculum.name}</h3>
                  {curriculum.description && (
                    <p className="text-gray-400 text-xs line-clamp-1">{curriculum.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{curriculum.video_count || 0} videos</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(curriculum)}
                    className="h-7 w-7 p-0 hover:bg-gray-700 text-gray-300 hover:text-white"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(curriculum.id)}
                    className="h-7 w-7 p-0 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {curriculums.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No curriculums found. Create your first curriculum to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
