"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { addPerformer, updatePerformer, deletePerformer } from "@/lib/actions"

interface Performer {
  id: string
  name: string
  created_at: string
  videoCount?: number
}

export default function PerformerManagement() {
  const [performers, setPerformers] = useState<Performer[]>([])
  const [newPerformerName, setNewPerformerName] = useState("")
  const [editingPerformer, setEditingPerformer] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchPerformers()
  }, [])

  const fetchPerformers = async () => {
    try {
      // Fetch performers with video counts using a join query
      const { data, error } = await supabase
        .from("performers")
        .select(`
          id,
          name,
          created_at,
          video_performers(count)
        `)
        .order("name")

      if (error) throw error

      // Transform the data to include video counts
      const performersWithCounts =
        data?.map((performer) => ({
          ...performer,
          videoCount: performer.video_performers?.[0]?.count || 0,
        })) || []

      setPerformers(performersWithCounts)
    } catch (error) {
      console.error("Error fetching performers:", error)
      setMessage({ type: "error", text: "Failed to load performers" })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newPerformerName.trim()) return

    try {
      const result = await addPerformer(newPerformerName)

      if (result.error) {
        throw new Error(result.error)
      }

      setMessage({ type: "success", text: "Performer added successfully" })
      setNewPerformerName("")
      await fetchPerformers()
    } catch (error) {
      console.error("Error adding performer:", error)
      setMessage({ type: "error", text: `Error adding performer: ${error.message}` })
    }
  }

  const handleEdit = (performer: Performer) => {
    setEditingPerformer(performer.id)
    setEditName(performer.name)
  }

  const handleUpdate = async () => {
    if (!editingPerformer || !editName.trim()) return

    try {
      const result = await updatePerformer(editingPerformer, editName)

      if (result.error) {
        throw new Error(result.error)
      }

      setEditingPerformer(null)
      setEditName("")
      setMessage({ type: "success", text: "Performer updated successfully" })
      await fetchPerformers()
    } catch (error) {
      console.error("Error updating performer:", error)
      setMessage({ type: "error", text: "Failed to update performer" })
    }
  }

  const handleDelete = async (performer: Performer) => {
    if (!globalThis.confirm(`Are you sure you want to delete "${performer.name}"? This will remove them from all videos.`)) {
      return
    }

    try {
      const result = await deletePerformer(performer.id)

      if (result.error) {
        throw new Error(result.error)
      }

      setMessage({ type: "success", text: "Performer deleted successfully" })
      await fetchPerformers()
    } catch (error) {
      console.error("Error deleting performer:", error)
      setMessage({ type: "error", text: "Failed to delete performer" })
    }
  }

  const cancelEdit = () => {
    setEditingPerformer(null)
    setEditName("")
  }

  if (loading) {
    return <div className="text-white">Loading performers...</div>
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add New Performer */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Add New Performer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Performer name"
              value={newPerformerName}
              onChange={(e) => setNewPerformerName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performers List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Performers ({performers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {performers.length === 0 ? (
            <p className="text-gray-400">
              No performers found. Add performers here and assign them to videos in the Video Management page.
            </p>
          ) : (
            <div className="space-y-2">
              {performers.map((performer) => (
                <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  {editingPerformer === performer.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleUpdate()}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                      <Button size="sm" onClick={handleUpdate} className="bg-green-600 hover:bg-green-700">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{performer.name}</span>
                        <span className="text-gray-400 text-sm">
                          {performer.videoCount || 0} video{performer.videoCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(performer)}
                          className="cursor-pointer hover:bg-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(performer)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
