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

    const { data: curriculumToDelete } = await serviceSupabase
      .from("curriculums")
      .select("display_order")
      .eq("id", curriculumId)
      .single()

    if (!curriculumToDelete) {
      return { error: "Curriculum not found" }
    }

    const deletedDisplayOrder = curriculumToDelete.display_order

    const { error: deleteError } = await serviceSupabase.from("curriculums").delete().eq("id", curriculumId)

    if (deleteError) {
      console.error("Error deleting curriculum:", deleteError)
      return { error: "Failed to delete curriculum" }
    }

    const { data: curriculumsToUpdate } = await serviceSupabase
      .from("curriculums")
      .select("id, display_order")
      .gt("display_order", deletedDisplayOrder)
      .order("display_order", { ascending: true })

    if (curriculumsToUpdate && curriculumsToUpdate.length > 0) {
      for (const curr of curriculumsToUpdate) {
        await serviceSupabase
          .from("curriculums")
          .update({ display_order: curr.display_order - 1 })
          .eq("id", curr.id)
      }
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

// ============================================
// Curriculum Set Actions
// ============================================

interface CurriculumSet {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
}

interface CurriculumSetWithLevels extends CurriculumSet {
  levels: Curriculum[]
}

export async function getCurriculumSets(): Promise<CurriculumSet[]> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: sets, error } = await serviceSupabase
      .from("curriculum_sets")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching curriculum sets:", error)
      return []
    }

    return sets || []
  } catch (error) {
    console.error("Error in getCurriculumSets:", error)
    return []
  }
}

export async function getCurriculumSetWithLevels(setId: string): Promise<CurriculumSetWithLevels | null> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: set, error: setError } = await serviceSupabase
      .from("curriculum_sets")
      .select("*")
      .eq("id", setId)
      .single()

    if (setError || !set) {
      console.error("Error fetching curriculum set:", setError)
      return null
    }

    const { data: levels, error: levelsError } = await serviceSupabase
      .from("curriculums")
      .select("*")
      .eq("curriculum_set_id", setId)
      .order("display_order", { ascending: true })

    if (levelsError) {
      console.error("Error fetching levels:", levelsError)
      return { ...set, levels: [] }
    }

    return { ...set, levels: levels || [] }
  } catch (error) {
    console.error("Error in getCurriculumSetWithLevels:", error)
    return null
  }
}

export async function createCurriculumSet(data: {
  name: string
  description?: string
}): Promise<{ success?: string; error?: string; id?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: newSet, error } = await serviceSupabase.from("curriculum_sets").insert({
      name: data.name,
      description: data.description || null,
    }).select().single()

    if (error) {
      console.error("Error creating curriculum set:", error)
      return { error: "Failed to create curriculum set" }
    }

    return { success: "Curriculum set created successfully", id: newSet?.id }
  } catch (error) {
    console.error("Error in createCurriculumSet:", error)
    return { error: "Failed to create curriculum set" }
  }
}

export async function updateCurriculumSet(
  setId: string,
  data: {
    name: string
    description?: string
  },
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("curriculum_sets").update({
      name: data.name,
      description: data.description || null,
    }).eq("id", setId)

    if (error) {
      console.error("Error updating curriculum set:", error)
      return { error: "Failed to update curriculum set" }
    }

    return { success: "Curriculum set updated successfully" }
  } catch (error) {
    console.error("Error in updateCurriculumSet:", error)
    return { error: "Failed to update curriculum set" }
  }
}

export async function deleteCurriculumSet(setId: string): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check if set has levels with videos
    const { data: levels } = await serviceSupabase
      .from("curriculums")
      .select("id")
      .eq("curriculum_set_id", setId)

    if (levels && levels.length > 0) {
      const levelIds = levels.map(l => l.id)
      const { count } = await serviceSupabase
        .from("video_curriculums")
        .select("*", { count: "exact", head: true })
        .in("curriculum_id", levelIds)

      if (count && count > 0) {
        return { error: `Cannot delete curriculum set. It contains ${count} video(s).` }
      }
    }

    // Check if set is assigned to users
    const { count: userCount } = await serviceSupabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("curriculum_set_id", setId)

    if (userCount && userCount > 0) {
      return { error: `Cannot delete curriculum set. It is assigned to ${userCount} user(s).` }
    }

    // Delete levels first
    if (levels && levels.length > 0) {
      await serviceSupabase.from("curriculums").delete().eq("curriculum_set_id", setId)
    }

    // Delete the set
    const { error } = await serviceSupabase.from("curriculum_sets").delete().eq("id", setId)

    if (error) {
      console.error("Error deleting curriculum set:", error)
      return { error: "Failed to delete curriculum set" }
    }

    return { success: "Curriculum set deleted successfully" }
  } catch (error) {
    console.error("Error in deleteCurriculumSet:", error)
    return { error: "Failed to delete curriculum set" }
  }
}

export async function addLevelToCurriculumSet(
  setId: string,
  levelData: {
    name: string
    description?: string
    color: string
    display_order?: number
  },
): Promise<{ success?: string; error?: string; id?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get max display_order for this set
    let displayOrder = levelData.display_order
    if (displayOrder === undefined) {
      const { data: maxOrderData } = await serviceSupabase
        .from("curriculums")
        .select("display_order")
        .eq("curriculum_set_id", setId)
        .order("display_order", { ascending: false })
        .limit(1)
        .single()

      displayOrder = maxOrderData ? maxOrderData.display_order + 1 : 0
    }

    const { data: newLevel, error } = await serviceSupabase.from("curriculums").insert({
      name: levelData.name,
      description: levelData.description || null,
      color: levelData.color,
      display_order: displayOrder,
      curriculum_set_id: setId,
    }).select().single()

    if (error) {
      console.error("Error adding level:", error)
      return { error: "Failed to add level" }
    }

    return { success: "Level added successfully", id: newLevel?.id }
  } catch (error) {
    console.error("Error in addLevelToCurriculumSet:", error)
    return { error: "Failed to add level" }
  }
}

export async function updateLevelInCurriculumSet(
  levelId: string,
  levelData: {
    name: string
    description?: string
    color: string
    display_order?: number
  },
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const updateData: any = {
      name: levelData.name,
      description: levelData.description || null,
      color: levelData.color,
    }

    if (levelData.display_order !== undefined) {
      updateData.display_order = levelData.display_order
    }

    const { error } = await serviceSupabase.from("curriculums").update(updateData).eq("id", levelId)

    if (error) {
      console.error("Error updating level:", error)
      return { error: "Failed to update level" }
    }

    return { success: "Level updated successfully" }
  } catch (error) {
    console.error("Error in updateLevelInCurriculumSet:", error)
    return { error: "Failed to update level" }
  }
}

export async function deleteLevelFromCurriculumSet(levelId: string): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check if level has videos
    const { count } = await serviceSupabase
      .from("video_curriculums")
      .select("*", { count: "exact", head: true })
      .eq("curriculum_id", levelId)

    if (count && count > 0) {
      return { error: `Cannot delete level. It is used by ${count} video(s).` }
    }

    // Get the level's curriculum set and display order
    const { data: levelToDelete } = await serviceSupabase
      .from("curriculums")
      .select("curriculum_set_id, display_order")
      .eq("id", levelId)
      .single()

    if (!levelToDelete) {
      return { error: "Level not found" }
    }

    const { error: deleteError } = await serviceSupabase.from("curriculums").delete().eq("id", levelId)

    if (deleteError) {
      console.error("Error deleting level:", deleteError)
      return { error: "Failed to delete level" }
    }

    // Reorder remaining levels in the set
    const { data: levelsToUpdate } = await serviceSupabase
      .from("curriculums")
      .select("id, display_order")
      .eq("curriculum_set_id", levelToDelete.curriculum_set_id)
      .gt("display_order", levelToDelete.display_order)
      .order("display_order", { ascending: true })

    if (levelsToUpdate && levelsToUpdate.length > 0) {
      for (const level of levelsToUpdate) {
        await serviceSupabase
          .from("curriculums")
          .update({ display_order: level.display_order - 1 })
          .eq("id", level.id)
      }
    }

    return { success: "Level deleted successfully" }
  } catch (error) {
    console.error("Error in deleteLevelFromCurriculumSet:", error)
    return { error: "Failed to delete level" }
  }
}

export async function reorderLevelsInCurriculumSet(
  setId: string,
  levelOrders: { id: string; display_order: number }[],
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const updates = levelOrders.map((item) =>
      serviceSupabase.from("curriculums").update({ display_order: item.display_order }).eq("id", item.id),
    )

    await Promise.all(updates)

    return { success: "Levels reordered successfully" }
  } catch (error) {
    console.error("Error in reorderLevelsInCurriculumSet:", error)
    return { error: "Failed to reorder levels" }
  }
}
