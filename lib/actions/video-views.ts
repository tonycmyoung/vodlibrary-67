"use server"

import { createClient } from "@supabase/supabase-js"

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

// Get videos with their aggregated view counts
export async function getVideosWithViewCounts() {
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
