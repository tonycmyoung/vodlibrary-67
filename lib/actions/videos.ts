import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function incrementVideoViews(videoId: string) {
  try {
    console.log("[v0] Incrementing views for video:", videoId)
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    let authenticatedUserId: string | null = null
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
              } catch {
                // The `setAll` method was called from a Server Component.
              }
            },
          },
        },
      )

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.log("[v0] Auth error:", authError)
      }

      authenticatedUserId = user?.id || null
      console.log("[v0] Authenticated user ID:", authenticatedUserId)
    } catch (userAuthError) {
      console.error("[v0] Error getting authenticated user:", userAuthError)
    }

    const viewedAt = new Date().toISOString()

    const { error: videoViewError } = await serviceSupabase.from("video_views").insert({
      video_id: videoId,
      user_id: authenticatedUserId,
      viewed_at: viewedAt,
      // TODO: Add ip_address and user_agent in future enhancement
    })

    if (videoViewError) {
      console.error("[v0] Error inserting into video_views:", videoViewError)
      return { error: "Failed to track video view" }
    }

    console.log("[v0] Successfully inserted into video_views table")

    if (authenticatedUserId) {
      console.log("[v0] Tracking user view for user:", authenticatedUserId)
      const { error: userViewError } = await serviceSupabase.from("user_video_views").insert({
        user_id: authenticatedUserId,
        video_id: videoId,
        viewed_at: viewedAt,
      })

      if (userViewError) {
        console.error("[v0] Error tracking user view:", userViewError)
        // Don't fail the main operation if user tracking fails
      } else {
        console.log("[v0] User view tracked successfully")
      }
    } else {
      console.log("[v0] No authenticated user, skipping user view tracking")
    }

    console.log("[v0] View increment successful")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in incrementVideoViews:", error)
    return { error: "Failed to increment video views" }
  }
}

export async function saveVideo(videoData: {
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  categoryIds?: string[]
  performerIds?: string[]
  durationSeconds?: number | null
  isPublished?: boolean
  recorded?: string | null
  videoId?: string | null
}) {
  const {
    title,
    description,
    videoUrl,
    thumbnailUrl,
    categoryIds = [],
    performerIds = [],
    durationSeconds,
    isPublished = true,
    recorded,
    videoId,
  } = videoData

  if (!title || !videoUrl) {
    return { error: "Title and video URL are required" }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    if (videoId) {
      // Update existing video
      const { error: videoError } = await serviceSupabase
        .from("videos")
        .update({
          title,
          description,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: durationSeconds,
          is_published: isPublished,
          recorded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", videoId)

      if (videoError) {
        console.error("Error updating video:", videoError)
        return { error: "Failed to update video" }
      }

      // Delete existing category relationships
      await serviceSupabase.from("video_categories").delete().eq("video_id", videoId)

      // Delete existing performer relationships
      await serviceSupabase.from("video_performers").delete().eq("video_id", videoId)

      // Insert new category relationships
      if (categoryIds.length > 0) {
        const categoryInserts = categoryIds.map((categoryId) => ({
          video_id: videoId,
          category_id: categoryId,
        }))

        const { error: categoryError } = await serviceSupabase.from("video_categories").insert(categoryInserts)

        if (categoryError) {
          console.error("Error inserting video categories:", categoryError)
        }
      }

      // Insert new performer relationships
      if (performerIds.length > 0) {
        const performerInserts = performerIds.map((performerId) => ({
          video_id: videoId,
          performer_id: performerId,
        }))

        const { error: performerError } = await serviceSupabase.from("video_performers").insert(performerInserts)

        if (performerError) {
          console.error("Error inserting video performers:", performerError)
        }
      }
    } else {
      // Insert new video
      const { data: videoData, error: videoError } = await serviceSupabase
        .from("videos")
        .insert({
          title,
          description,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: durationSeconds,
          is_published: isPublished,
          recorded,
        })
        .select()
        .single()

      if (videoError) {
        console.error("Error saving video:", videoError)
        return { error: "Failed to save video" }
      }

      const newVideoId = videoData.id

      // Insert category relationships
      if (categoryIds.length > 0) {
        const categoryInserts = categoryIds.map((categoryId) => ({
          video_id: newVideoId,
          category_id: categoryId,
        }))

        const { error: categoryError } = await serviceSupabase.from("video_categories").insert(categoryInserts)

        if (categoryError) {
          console.error("Error inserting video categories:", categoryError)
        }
      }

      // Insert performer relationships
      if (performerIds.length > 0) {
        const performerInserts = performerIds.map((performerId) => ({
          video_id: newVideoId,
          performer_id: performerId,
        }))

        const { error: performerError } = await serviceSupabase.from("video_performers").insert(performerInserts)

        if (performerError) {
          console.error("Error inserting video performers:", performerError)
        }
      }
    }

    return { success: videoId ? "Video updated successfully" : "Video saved successfully" }
  } catch (error) {
    console.error("Error in saveVideo:", error)
    return { error: "Failed to save video" }
  }
}
