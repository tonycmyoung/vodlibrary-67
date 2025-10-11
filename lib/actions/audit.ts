"use server"

import { createClient } from "@supabase/supabase-js"

interface AuditLogEntry {
  actor_id: string
  actor_email: string
  action: "user_signup" | "user_approval" | "user_deletion" | "user_invitation"
  target_id?: string
  target_email?: string
  additional_data?: Record<string, any>
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("audit_logs").insert({
      actor_id: entry.actor_id,
      actor_email: entry.actor_email,
      action: entry.action,
      target_id: entry.target_id || null,
      target_email: entry.target_email || null,
      additional_data: entry.additional_data || null,
    })

    if (error) {
      console.error("[v0] Failed to log audit event:", error)
    }
  } catch (error) {
    console.error("[v0] Error in logAuditEvent:", error)
  }
}

export async function fetchAuditLogs() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await serviceSupabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching audit logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in fetchAuditLogs:", error)
    return []
  }
}

export async function clearAuditLogs() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase
      .from("audit_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    if (error) {
      console.error("Error clearing audit logs:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in clearAuditLogs:", error)
    throw error
  }
}
