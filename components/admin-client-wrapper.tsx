"use client"

import PendingUsers from "./pending-users"
import UnconfirmedEmailUsers from "./unconfirmed-email-users"
import AdminStats from "./admin-stats"
import AdminRefreshButton from "./admin-refresh-button"

export default function AdminClientWrapper() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <AdminRefreshButton />
        </div>

        <div className="space-y-8">
          <AdminStats />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PendingUsers />
            <UnconfirmedEmailUsers />
          </div>
        </div>
      </div>
    </div>
  )
}
