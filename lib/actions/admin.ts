"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "../auth"
import { getTotalVideoViews, getVideoViewsInDateRange } from "./video-views"

export async function getTelemetryData() {
  try {
    console.log("[v0] Starting getTelemetryData function")
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    console.log("[v0] Current date:", now.toISOString())

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDay() === 0 ? now.getDate() - 6 : now.getDate() - (now.getDay() - 1)) // Adjust for Sunday being the start of the week
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    console.log("[v0] This week range:", startOfWeek.toISOString(), "to", endOfWeek.toISOString())

    const startOfLastWeek = new Date(startOfWeek)
    startOfLastWeek.setDate(startOfWeek.getDate() - 7)

    const endOfLastWeek = new Date(startOfLastWeek)
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
    endOfLastWeek.setHours(23, 59, 59, 999)

    console.log("[v0] Last week range:", startOfLastWeek.toISOString(), "to", endOfLastWeek.toISOString())

    const [totalUsersResult, pendingUsersResult, thisWeekLoginsResult, lastWeekLoginsResult] = await Promise.all([
      serviceSupabase.from("users").select("id", { count: "exact" }),
      serviceSupabase.from("users").select("id", { count: "exact" }).eq("is_approved", false),
      serviceSupabase
        .from("user_logins")
        .select("user_id")
        .gte("login_time::date", startOfWeek.toISOString().split("T")[0])
        .lte("login_time::date", endOfWeek.toISOString().split("T")[0]),
      serviceSupabase
        .from("user_logins")
        .select("user_id")
        .gte("login_time::date", startOfLastWeek.toISOString().split("T")[0])
        .lte("login_time::date", endOfLastWeek.toISOString().split("T")[0]),
    ])

    const totalViews = await getTotalVideoViews()
    console.log("[v0] Total views calculated:", totalViews)

    const thisWeekViews = await getVideoViewsInDateRange(startOfWeek, endOfWeek)
    console.log("[v0] This week views:", thisWeekViews)

    const lastWeekViews = await getVideoViewsInDateRange(startOfLastWeek, endOfLastWeek)
    console.log("[v0] Last week views:", lastWeekViews)

    console.log(
      "[v0] This week logins query result:",
      thisWeekLoginsResult.data?.length,
      "logins, error:",
      thisWeekLoginsResult.error,
    )

    const thisWeekUserLogins = thisWeekLoginsResult.data?.length || 0
    console.log("[v0] Total logins this week:", thisWeekUserLogins)

    console.log(
      "[v0] Last week logins query result:",
      lastWeekLoginsResult.data?.length,
      "logins, error:",
      lastWeekLoginsResult.error,
    )

    const lastWeekUserLogins = lastWeekLoginsResult.data?.length || 0
    console.log("[v0] Total logins last week:", lastWeekUserLogins)

    const result = {
      success: true,
      data: {
        totalUsers: totalUsersResult.count || 0,
        pendingUsers: pendingUsersResult.count || 0,
        totalViews,
        thisWeekViews,
        lastWeekViews,
        thisWeekUserLogins,
        lastWeekUserLogins,
      },
    }

    console.log("[v0] Final telemetry result:", result)
    return result
  } catch (error) {
    console.error("[v0] Error getting telemetry data:", error)
    return {
      success: false,
      data: {
        totalUsers: 0,
        pendingUsers: 0,
        totalViews: 0,
        thisWeekViews: 0,
        lastWeekViews: 0,
        thisWeekUserLogins: 0,
        lastWeekUserLogins: 0,
      },
    }
  }
}

export async function clearAuthDebugLogs() {
  const user = await getCurrentUser()
  if (!user || user.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await serviceSupabase
    .from("auth_debug_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

  if (error) {
    throw new Error("Failed to clear debug logs")
  }

  revalidatePath("/admin/debug")
}

export async function fetchAuthDebugLogs() {
  console.log("[v0] fetchAuthDebugLogs called")
  const user = await getCurrentUser()
  console.log("[v0] Current user:", user ? { id: user.id, role: user.role } : "null")

  if (!user || user.role !== "Admin") {
    console.log("[v0] Unauthorized access attempt")
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  console.log("[v0] Created service client")

  const { data, error } = await serviceSupabase
    .from("auth_debug_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  console.log("[v0] Query result:", { dataCount: data?.length || 0, error })

  if (error) {
    console.log("[v0] Database error:", error)
    throw new Error("Failed to fetch debug logs")
  }

  console.log("[v0] Returning data:", data)
  return data
}
