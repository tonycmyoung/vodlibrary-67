"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Video, UserCheck, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Stats {
  totalUsers: number
  pendingUsers: number
  totalVideos: number
  totalCategories: number
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingUsers: 0,
    totalVideos: 0,
    totalCategories: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersResult, pendingResult, videosResult, categoriesResult] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase.from("users").select("id", { count: "exact" }).eq("is_approved", false),
        supabase.from("videos").select("id", { count: "exact" }),
        supabase.from("categories").select("id", { count: "exact" }),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        pendingUsers: pendingResult.count || 0,
        totalVideos: videosResult.count || 0,
        totalCategories: categoriesResult.count || 0,
      })
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
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-black/60 border-gray-800">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-black/60 border-gray-800 hover:border-purple-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
