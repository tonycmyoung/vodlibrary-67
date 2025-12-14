import { createClient } from "@supabase/supabase-js"

export async function addPerformer(
  nameOrFormData: string | FormData,
  formData?: FormData,
): Promise<{ success?: string; error?: string }> {
  let name: string

  // Handle both direct string call and FormData call
  if (typeof nameOrFormData === "string") {
    name = nameOrFormData
  } else {
    name = nameOrFormData.get("name") as string
  }

  if (!name) {
    return { error: "Name is required" }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").insert({
      name,
    })

    if (error) {
      console.error("Error adding performer:", error)
      return { error: "Failed to add performer" }
    }

    return { success: "Performer added successfully" }
  } catch (error) {
    console.error("Error in addPerformer:", error)
    return { error: "Failed to add performer" }
  }
}

export async function updatePerformer(
  performerId: string,
  name: string,
  bio: string,
): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").update({ name, bio }).eq("id", performerId)

    if (error) {
      console.error("Error updating performer:", error)
      return { error: "Failed to update performer" }
    }

    return { success: "Performer updated successfully" }
  } catch (error) {
    console.error("Error in updatePerformer:", error)
    return { error: "Failed to update performer" }
  }
}

export async function deletePerformer(performerId: string): Promise<{ success?: string; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").delete().eq("id", performerId)

    if (error) {
      console.error("Error deleting performer:", error)
      return { error: "Failed to delete performer" }
    }

    return { success: "Performer deleted successfully" }
  } catch (error) {
    console.error("Error in deletePerformer:", error)
    return { error: "Failed to delete performer" }
  }
}
