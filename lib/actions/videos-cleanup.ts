"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// PHASE 5: Final version of incrementVideoViews without dual-write
// Use this to replace the current function once the new system is verified
export async function incrementVideoViewsFinal(videoId: string) {
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

    // Insert into video_views table (primary system)
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

    // Track user-specific view if authenticated
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
