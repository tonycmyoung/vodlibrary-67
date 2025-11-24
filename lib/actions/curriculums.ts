"use server"

import { createClient } from "@supabase/supabase-js"

interface Curriculum {
  id: string
  name: string
  description: string | null
  color: string
  display_order: number
  created_at: string
  created_by: string | null
  video_count?: number
}

export async function getCurriculums(): Promise<Curriculum[]> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch curriculums ordered by display_order
    const { data: curriculums, error } = await serviceSupabase
      .from("curriculums")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching curriculums:", error)
      return []
    }

    // Get video counts for each curriculum
    const curriculumsWithCounts = await Promise.all(
      (curriculums || []).map(async (curriculum) => {
        const { count } = await serviceSupabase
          .from("video_curriculums")
          .select("*", { count: "exact", head: true })
          .eq("curriculum_id", curriculum.id)

        return {
          ...curriculum,
          video_count: count || 0,
        }
      }),
    )

    return curriculumsWithCounts
  } catch (error) {
    console.error("Error in getCurriculums:", error)
    return []
  }
}

export async function addCurriculum(curriculumData: {
  name: string
  description?: string
  color: string
  display_order?: number
}): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // If display_order not provided, set it to the max + 1
    let displayOrder = curriculumData.display_order
    if (displayOrder === undefined) {
      const { data: maxOrderData } = await serviceSupabase
        .from("curriculums")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .single()

      displayOrder = maxOrderData ? maxOrderData.display_order + 1 : 0
    }

    const { error } = await serviceSupabase.from("curriculums").insert({
      name: curriculumData.name,
      description: curriculumData.description || null,
      color: curriculumData.color,
      display_order: displayOrder,
    })

    if (error) {
      console.error("Error adding curriculum:", error)
      return { error: "Failed to add curriculum" }
    }

    return { success: "Curriculum added successfully" }
  } catch (error) {
    console.error("Error in addCurriculum:", error)
    return { error: "Failed to add curriculum" }
  }
}

export async function updateCurriculum(
  curriculumId: string,
  curriculumData: {
    name: string
    description?: string
    color: string
    display_order?: number
  },
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const updateData: any = {
      name: curriculumData.name,
      description: curriculumData.description || null,
      color: curriculumData.color,
    }

    if (curriculumData.display_order !== undefined) {
      updateData.display_order = curriculumData.display_order
    }

    const { error } = await serviceSupabase.from("curriculums").update(updateData).eq("id", curriculumId)

    if (error) {
      console.error("Error updating curriculum:", error)
      return { error: "Failed to update curriculum" }
    }

    return { success: "Curriculum updated successfully" }
  } catch (error) {
    console.error("Error in updateCurriculum:", error)
    return { error: "Failed to update curriculum" }
  }
}

export async function deleteCurriculum(curriculumId: string): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check if curriculum has videos
    const { count } = await serviceSupabase
      .from("video_curriculums")
      .select("*", { count: "exact", head: true })
      .eq("curriculum_id", curriculumId)

    if (count && count > 0) {
      return { error: `Cannot delete curriculum. It is used by ${count} video(s).` }
    }

    const { error } = await serviceSupabase.from("curriculums").delete().eq("id", curriculumId)

    if (error) {
      console.error("Error deleting curriculum:", error)
      return { error: "Failed to delete curriculum" }
    }

    return { success: "Curriculum deleted successfully" }
  } catch (error) {
    console.error("Error in deleteCurriculum:", error)
    return { error: "Failed to delete curriculum" }
  }
}

export async function reorderCurriculums(
  curriculumOrders: { id: string; display_order: number }[],
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Update display_order for each curriculum
    const updates = curriculumOrders.map((item) =>
      serviceSupabase.from("curriculums").update({ display_order: item.display_order }).eq("id", item.id),
    )

    await Promise.all(updates)

    return { success: "Curriculums reordered successfully" }
  } catch (error) {
    console.error("Error in reorderCurriculums:", error)
    return { error: "Failed to reorder curriculums" }
  }
}
