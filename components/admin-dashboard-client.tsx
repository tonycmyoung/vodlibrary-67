"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import AdminStats from "@/components/admin-stats"
import PendingUsers from "@/components/pending-users"
import UnconfirmedEmailUsers from "@/components/unconfirmed-email-users"

export default function AdminDashboardClient() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      globalThis.dispatchEvent(new CustomEvent("admin-refresh-stats"))
      globalThis.dispatchEvent(new CustomEvent("admin-refresh-pending-users"))
      globalThis.dispatchEvent(new CustomEvent("admin-refresh-unconfirmed-users"))

      // Wait a bit for the events to be processed
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error("Error refreshing admin data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Manage users, videos, and categories</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh All"}
        </Button>
      </div>

      <AdminStats />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <PendingUsers />
        <UnconfirmedEmailUsers />
      </div>
    </div>
  )
}
