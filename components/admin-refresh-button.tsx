"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function AdminRefreshButton() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      window.dispatchEvent(new CustomEvent("admin-refresh-pending-users"))
      window.dispatchEvent(new CustomEvent("admin-refresh-unconfirmed-users"))
      window.dispatchEvent(new CustomEvent("admin-refresh-stats"))

      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error refreshing admin data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={refreshing}
      variant="outline"
      size="sm"
      className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white bg-transparent"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing..." : "Refresh All"}
    </Button>
  )
}
