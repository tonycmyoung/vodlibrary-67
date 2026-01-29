"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Tags, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatShortDate } from "@/lib/utils/date"

interface Category {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  video_count?: number
}

const PRESET_COLORS = [
  "#DC2626", // Red
  "#EA580C", // Orange
  "#CA8A04", // Yellow
  "#16A34A", // Green
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#DB2777", // Pink
  "#059669", // Emerald
  "#0891B2", // Cyan
  "#7C2D12", // Brown
]

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const supabase = createClient()
      // Fetch categories with video count
      const { data, error } = await supabase
        .from("categories")
        .select(
          `
          *,
          video_categories!inner(count)
        `,
        )
        .order("name")

      if (error) throw error

      const categoriesWithCount = await Promise.all(
        (data || []).map(async (category: any) => {
          const { count } = await supabase
            .from("video_categories")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id)

          return {
            ...category,
            video_count: count || 0,
          }
        }),
      )

      setCategories(categoriesWithCount)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: PRESET_COLORS[0],
    })
    setEditingCategory(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      const supabase = createClient()
      const categoryData = {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
      }

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase.from("categories").update(categoryData).eq("id", editingCategory.id)

        if (error) throw error
      } else {
        // Create new category
        const { error } = await supabase.from("categories").insert(categoryData)

        if (error) throw error
      }

      // Refresh categories
      await fetchCategories()

      // Close dialog and reset form
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color,
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (categoryId: string) => {
    if (!globalThis.confirm("Are you sure you want to delete this category? This will remove it from all videos.")) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)

      if (error) throw error

      await fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  if (loading) {
    return (
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-300">Loading categories...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Categories ({categories.length})</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="category-name" className="block text-sm font-medium text-gray-300 mb-2">
                      Name
                    </label>
                    <Input
                      id="category-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="category-description" className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <Textarea
                      id="category-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="category-color-picker" className="block text-sm font-medium text-gray-300 mb-2">
                      Color
                    </label>
                    <div id="category-color-picker" className="grid grid-cols-5 gap-2">
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
                      onClick={() => setIsAddDialogOpen(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                      {editingCategory ? "Update Category" : "Add Category"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Categories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="bg-black/60 border-gray-800 hover:border-purple-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-0.5">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                  <h3 className="font-semibold text-white">{category.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(category)}
                    className="cursor-pointer hover:bg-gray-700"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(category.id)}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {category.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{category.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Tags className="w-3 h-3" />
                  <span>{category.video_count || 0} videos</span>
                </div>
                <span>Created {formatShortDate(category.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-400">No categories found. Create your first category to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
