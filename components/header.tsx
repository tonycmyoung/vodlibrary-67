"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Heart, Settings, Lock, MessageSquare } from "lucide-react"
import { signOut } from "@/lib/actions"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import NotificationBell from "@/components/notification-bell"

interface HeaderProps {
  user: {
    id: string
    full_name: string | null
    is_approved: boolean
    email?: string
    profile_image_url?: string | null
    role?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isAdmin = user.email === "acmyma@gmail.com"
  const isStudentView = searchParams.get("admin-view") === "student"
  const isProfilePage = typeof window !== "undefined" && window.location.pathname === "/profile"
  const showAdminView = isAdmin && (isStudentView || isProfilePage)

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const handleProfileClick = () => {
    router.push("/profile")
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-red-800/30">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">武</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TY Kobudo Library</h1>
              <p className="text-xs text-gray-400">Training Video Library</p>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-gray-300 hover:text-white transition-colors">
            Library
          </Link>
          <Link
            href="/favorites"
            className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
          >
            <Heart className="w-4 h-4" />
            <span>Favorites</span>
          </Link>
          {showAdminView && (
            <Link
              href="/admin"
              className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1 bg-orange-500/10 px-3 py-1 rounded-md border border-orange-500/20"
            >
              <Settings className="w-4 h-4" />
              <span>Admin View</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          <NotificationBell userId={user.id} isAdmin={isAdmin} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-12 w-12 rounded-full p-0 hover:bg-yellow-400/30 hover:scale-110 hover:shadow-lg hover:shadow-yellow-400/50 transition-all duration-300 border-2 border-transparent hover:border-yellow-400"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profile_image_url || "/placeholder.svg"} alt={user.full_name || "User"} />
                  <AvatarFallback className="bg-red-600 text-white hover:bg-yellow-600 transition-colors">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-white">{user.full_name}</p>
                  <p className="text-xs text-gray-400">{user.role || "Student"}</p>
                </div>
              </div>
              <DropdownMenuItem
                className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                onClick={handleProfileClick}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
                <Link href="/contact" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Admin
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
                <Link href="/change-password" className="flex items-center">
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
                <form action={signOut}>
                  <button type="submit" className="flex items-center w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
