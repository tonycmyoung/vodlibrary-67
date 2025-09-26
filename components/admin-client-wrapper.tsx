"use client"

import { useRef } from "react"
import PendingUsers from "./pending-users"
import UnconfirmedEmailUsers from "./unconfirmed-email-users"
import AdminStats from "./admin-stats"
import AdminRefreshButton from "./admin-refresh-button"

export default function AdminClientWrapper() {
  const pendingUsersRef = useRef<{ refresh: () => Promise<void> } | null>(null)
  const unconfirmedUsersRef = useRef<{ refresh: () => Promise<void> } | null>(null)
  const adminStatsRef = useRef<{ refresh: () => Promise<void> } | null>(null)

  const handleRefreshAll = async () => {
    const refreshPromises = []

    if (pendingUsersRef.current?.refresh) {
      refreshPromises.push(pendingUsersRef.current.refresh())
    }
    if (unconfirmedUsersRef.current?.refresh) {
      refreshPromises.push(unconfirmedUsersRef.current.refresh())
    }
    if (adminStatsRef.current?.refresh) {
      refreshPromises.push(adminStatsRef.current.refresh())
    }

    await Promise.all(refreshPromises)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <AdminRefreshButton onRefresh={handleRefreshAll} />
        </div>

        <div className="space-y-8">
          <AdminStats ref={adminStatsRef} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PendingUsers ref={pendingUsersRef} />
            <UnconfirmedEmailUsers ref={unconfirmedUsersRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
