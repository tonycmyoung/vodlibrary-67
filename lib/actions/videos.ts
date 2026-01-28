"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function incrementVideoViews(videoId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    let authenticatedUserId: string | null = null
    try {
      const cookieStore = await cookies()
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
        // Auth error - continue without user ID
      }

      authenticatedUserId = user?.id || null
    } catch (userAuthError) {
      console.error("[v0] Error getting authenticated user:", userAuthError)
    }

    const viewedAt = new Date().toISOString()

    const { error: videoViewError } = await serviceSupabase.from("video_views").insert({
      video_id: videoId,
      user_id: authenticatedUserId,
      viewed_at: viewedAt,
    })

    if (videoViewError) {
      console.error("[v0] Error inserting into video_views:", videoViewError)
      return { error: "Failed to track video view" }
    }

    if (authenticatedUserId) {
      const { error: userViewError } = await serviceSupabase.from("user_video_views").insert({
        user_id: authenticatedUserId,
        video_id: videoId,
        viewed_at: viewedAt,
      })

      if (userViewError) {
        console.error("[v0] Error tracking user view:", userViewError)
        // Don't fail the main operation if user tracking fails
      }
    }

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
  curriculumIds?: string[]
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
    curriculumIds = [],
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

      await serviceSupabase.from("video_curriculums").delete().eq("video_id", videoId)

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

      if (curriculumIds.length > 0) {
        const curriculumInserts = curriculumIds.map((curriculumId) => ({
          video_id: videoId,
          curriculum_id: curriculumId,
        }))

        const { error: curriculumError } = await serviceSupabase.from("video_curriculums").insert(curriculumInserts)

        if (curriculumError) {
          console.error("Error inserting video curriculums:", curriculumError)
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

      if (curriculumIds.length > 0) {
        const curriculumInserts = curriculumIds.map((curriculumId) => ({
          video_id: newVideoId,
          curriculum_id: curriculumId,
        }))

        const { error: curriculumError } = await serviceSupabase.from("video_curriculums").insert(curriculumInserts)

        if (curriculumError) {
          console.error("Error inserting video curriculums:", curriculumError)
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

// Helper functions for querying video views from the new video_views table
export async function getVideoViewCount(videoId: string): Promise<number> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { count, error } = await serviceSupabase
    .from("video_views")
    .select("*", { count: "exact", head: true })
    .eq("video_id", videoId)

  if (error) {
    console.error("Error getting video view count:", error)
    return 0
  }

  return count || 0
}

export async function getVideoLastViewed(videoId: string): Promise<string | null> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await serviceSupabase
    .from("video_views")
    .select("viewed_at")
    .eq("video_id", videoId)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error getting video last viewed:", error)
    return null
  }

  return data?.viewed_at || null
}

export async function getTotalVideoViews(): Promise<number> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { count, error } = await serviceSupabase.from("video_views").select("*", { count: "exact", head: true })

  if (error) {
    console.error("Error getting total video views:", error)
    return 0
  }

  return count || 0
}

export async function getVideoViewsInDateRange(startDate: Date, endDate: Date): Promise<number> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { count, error } = await serviceSupabase
    .from("video_views")
    .select("*", { count: "exact", head: true })
    .gte("viewed_at", startDate.toISOString())
    .lte("viewed_at", endDate.toISOString())

  if (error) {
    console.error("Error getting video views in date range:", error)
    return 0
  }

  return count || 0
}

export async function getVideosWithViewCounts(): Promise<
  Array<{
    video_id: string
    total_views: number
    last_viewed: string
    unique_user_views: number
  }>
> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await serviceSupabase.from("video_views").select(`
      video_id,
      viewed_at
    `)

  if (error) {
    console.error("Error getting videos with view counts:", error)
    return []
  }

  // Aggregate the data in JavaScript
  const aggregated = data?.reduce((acc: any, view: any) => {
    const videoId = view.video_id
    if (!acc[videoId]) {
      acc[videoId] = {
        video_id: videoId,
        total_views: 0,
        last_viewed: view.viewed_at,
        unique_user_views: 0, // Note: This would require a more complex query to calculate properly
      }
    }
    acc[videoId].total_views++
    if (new Date(view.viewed_at) > new Date(acc[videoId].last_viewed)) {
      acc[videoId].last_viewed = view.viewed_at
    }
    return acc
  }, {})

  return Object.values(aggregated || {})
}

export async function getBatchVideoViewCounts(videoIds: string[]): Promise<Record<string, number>> {
  if (videoIds.length === 0) return {}

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await serviceSupabase.from("video_views").select("video_id").in("video_id", videoIds)

  if (error) {
    console.error("Error getting batch video view counts:", error)
    return {}
  }

  // Aggregate the counts by video_id
  const viewCounts =
    data?.reduce((acc: Record<string, number>, view: any) => {
      const videoId = view.video_id
      acc[videoId] = (acc[videoId] || 0) + 1
      return acc
    }, {}) || {}

  // Ensure all requested video IDs are included (with 0 if no views)
  videoIds.forEach((id) => {
    if (!(id in viewCounts)) {
      viewCounts[id] = 0
    }
  })

  return viewCounts
}

export async function getBatchVideoLastViewed(videoIds: string[]): Promise<Record<string, string | null>> {
  if (videoIds.length === 0) return {}

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await serviceSupabase
    .from("video_views")
    .select("video_id, viewed_at")
    .in("video_id", videoIds)
    .order("viewed_at", { ascending: false })

  if (error) {
    console.error("Error fetching video last viewed:", error)
    return {}
  }

  // Group by video_id and take the most recent viewed_at for each
  const lastViewedMap: Record<string, string | null> = {}

  // Initialize all video IDs with null
  for (const videoId of videoIds) {
    lastViewedMap[videoId] = null
  }

  // Set the most recent viewed_at for each video
  for (const view of data) {
    if (!lastViewedMap[view.video_id]) {
      lastViewedMap[view.video_id] = view.viewed_at
    }
  }

  return lastViewedMap
}

export interface VideoViewLog {
  id: string
  video_id: string
  video_title: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  viewed_at: string
}

export async function fetchVideoViewLogs(): Promise<VideoViewLog[]> {
  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Query user_video_views which has proper FK to public.users
  const { data: viewLogs, error } = await serviceSupabase
    .from("user_video_views")
    .select(`
      id,
      video_id,
      user_id,
      viewed_at,
      videos (
        id,
        title
      ),
      users (
        id,
        full_name,
        email
      )
    `)
    .order("viewed_at", { ascending: false })

  if (error) {
    console.error("Error fetching video view logs:", error)
    return []
  }

  // Transform the data
  const transformedData: VideoViewLog[] = (viewLogs || []).map((log: any) => ({
    id: log.id,
    video_id: log.video_id,
    video_title: log.videos?.title || "Unknown Video",
    user_id: log.user_id,
    user_name: log.users?.full_name || null,
    user_email: log.users?.email || null,
    viewed_at: log.viewed_at,
  }))

  return transformedData
}
