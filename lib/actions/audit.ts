"use server"

import { createClient } from "@supabase/supabase-js"
import { serverTrace } from "../trace-logger"

interface AuditLogEntry {
  actor_id: string
  actor_email: string
  action: "user_signup" | "user_approval" | "user_deletion" | "user_invitation" | "password_reset"
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
      serverTrace.error("Failed to log audit event", { category: "audit", payload: { error: String(error) } })
    }
  } catch (error) {
    serverTrace.error("Error in logAuditEvent", { category: "audit", payload: { error: String(error) } })
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
      serverTrace.error("Error fetching audit logs", { category: "audit", payload: { error: String(error) } })
      return []
    }

    return data || []
  } catch (error) {
    serverTrace.error("Error in fetchAuditLogs", { category: "audit", payload: { error: String(error) } })
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
      serverTrace.error("Error clearing audit logs", { category: "audit", payload: { error: String(error) } })
      throw error
    }
  } catch (error) {
    serverTrace.error("Error in clearAuditLogs", { category: "audit", payload: { error: String(error) } })
    throw error
  }
}
