"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Users, TrendingUp, LogIn } from "lucide-react"
import { getTelemetryData } from "@/lib/actions"

interface Stats {
  totalUsers: number
  totalViews: number
  thisWeekViews: number
  lastWeekViews: number
  thisWeekUserLogins: number
  lastWeekUserLogins: number
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
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

    const handleRefresh = () => {
      fetchStats()
    }

    window.addEventListener("admin-refresh-stats", handleRefresh)

    return () => {
      window.removeEventListener("admin-refresh-stats", handleRefresh)
    }
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
      href: "/admin/users",
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
      title: "Logons This Week",
      value: stats.thisWeekUserLogins,
      subtitle: `Last week: ${stats.lastWeekUserLogins}`,
      icon: LogIn,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      href: "/admin/debug",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...new Array(3)].map((_, i) => (
          <Card key={`skeleton-card-${i + 1}`} className="bg-black/60 border-gray-800">
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
    <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon
        const cardContent = (
          <Card
            className={`bg-black/60 border-gray-800 hover:border-purple-700 transition-colors ${stat.href ? "cursor-pointer" : ""}`}
          >
            <div className="p-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">{stat.title}</h3>
                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                {(stat.subtitle || stat.totalViews !== undefined) && (
                  <div className="text-right">
                    {stat.subtitle && <p className="text-xs text-gray-400">{stat.subtitle}</p>}
                    {stat.totalViews !== undefined && (
                      <p className="text-xs text-gray-500">Total Views: {stat.totalViews.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )

        return stat.href ? (
          <Link key={stat.title} href={stat.href}>
            {cardContent}
          </Link>
        ) : (
          <div key={stat.title}>{cardContent}</div>
        )
      })}
    </div>
  )
}
