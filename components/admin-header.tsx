"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, Settings, Users, Video, Tags, Home, Bell, UserPlus, Menu, X, LogOut, Bug } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NotificationBell from "@/components/notification-bell"
import InviteUserModal from "@/components/invite-user-modal"
import { useState } from "react"

interface AdminHeaderProps {
  user: {
    id: string
    full_name: string | null
    email: string
    is_approved: boolean
    profile_image_url?: string | null
  }
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "A"

  const handleSignOutClick = () => {
    router.push("/signout")
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-purple-800/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-gray-400">TY Kobudo Library</p>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center space-x-6">
            <Link
              href="/student-view"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Home className="w-4 h-4" />
              <span>Student View</span>
            </Link>
            <Link
              href="/admin/users"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Users className="w-4 h-4" />
              <span>Users</span>
            </Link>
            <Link
              href="/admin/videos"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Video className="w-4 h-4" />
              <span>Videos</span>
            </Link>
            <Link
              href="/admin/categories"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Tags className="w-4 h-4" />
              <span>Categories</span>
            </Link>
            <Link
              href="/admin/performers"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <User className="w-4 h-4" />
              <span>Performers</span>
            </Link>
            <Link
              href="/admin/notifications"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </Link>
            <Link
              href="/admin/debug"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-purple-800/20"
            >
              <Bug className="w-4 h-4" />
              <span>Debug</span>
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-purple-600/40 hover:text-purple-100 border border-transparent hover:border-purple-400/50 transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <NotificationBell userId={user.id} isAdmin={true} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full cursor-pointer hover:bg-purple-600/20 hover:ring-2 hover:ring-purple-500/50 transition-all duration-200 hover:scale-105"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profile_image_url || "/placeholder.svg"} alt={user.full_name || "Admin"} />
                    <AvatarFallback className="bg-purple-600 text-white">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-white">{user.full_name}</p>
                    <p className="text-xs text-purple-400">Administrator</p>
                  </div>
                </div>
                <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={handleSignOutClick}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden bg-black/90 backdrop-blur-md border-t border-purple-800/30">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              <Link
                href="/student-view"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                <span>Student View</span>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/videos"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Video className="w-4 h-4" />
                <span>Videos</span>
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Tags className="w-4 h-4" />
                <span>Categories</span>
              </Link>
              <Link
                href="/admin/performers"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Performers</span>
              </Link>
              <Link
                href="/admin/notifications"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </Link>
              <Link
                href="/admin/debug"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Bug className="w-4 h-4" />
                <span>Debug</span>
              </Link>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-purple-800/20"
                onClick={handleSignOutClick}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </nav>
          </div>
        )}
      </header>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </>
  )
}
