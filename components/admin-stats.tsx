"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Users, Video, UserCheck, Clock, TrendingUp, LogIn } from "lucide-react"
import { getTelemetryData } from "@/lib/actions"

interface Stats {
  totalUsers: number
  pendingUsers: number
  totalVideos: number
  totalCategories: number
  totalViews: number
  thisWeekViews: number
  lastWeekViews: number
  thisWeekUserLogins: number
  lastWeekUserLogins: number
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingUsers: 0,
    totalVideos: 0,
    totalCategories: 0,
    totalViews: 0,
    thisWeekViews: 0,
    lastWeekViews: 0,
    thisWeekUserLogins: 0,
    lastWeekUserLogins: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const telemetryResult = await getTelemetryData()

      if (telemetryResult.success) {
        setStats(telemetryResult.data)
      }

      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Approval",
      value: stats.pendingUsers,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Total Videos",
      value: stats.totalVideos,
      icon: Video,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Categories",
      value: stats.totalCategories,
      icon: UserCheck,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Videos Viewed This Week",
      value: stats.thisWeekViews,
      subtitle: `Last week: ${stats.lastWeekViews}`,
      totalViews: stats.totalViews,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Daily Logons This Week",
      value: stats.thisWeekUserLogins,
      subtitle: `Last week: ${stats.lastWeekUserLogins}`,
      icon: LogIn,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(7)].map((_, i) => (
          <Card key={i} className="bg-black/60 border-gray-800">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-black/60 border-gray-800 hover:border-purple-500/50 transition-colors p-0">
            <div className="p-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">{stat.title}</h3>
                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</div>
              {stat.subtitle && <p className="text-xs text-gray-400">{stat.subtitle}</p>}
              {stat.totalViews !== undefined && (
                <p className="text-xs text-gray-500 mt-1 border-t border-gray-700 pt-1">
                  Total Views: {stat.totalViews.toLocaleString()}
                </p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
