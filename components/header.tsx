"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  User,
  Heart,
  Settings,
  Lock,
  MessageSquare,
  UserPlus,
  DollarSign,
  BookOpen,
  LogOut,
  Upload,
  Users,
  SquarePlay,
  Ribbon,
  Info,
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import NotificationBell from "@/components/notification-bell"
import InviteUserModal from "@/components/invite-user-modal"
import DonationModal from "@/components/donation-modal"
import CurriculumModal from "@/components/curriculum-modal"
import ContributeModal from "@/components/contribute-modal"
import AboutModal from "@/components/about-modal"
import { useState } from "react"

interface HeaderProps {
  user: {
    id: string
    full_name: string | null
    is_approved: boolean
    email?: string
    profile_image_url?: string | null
    role?: string | null
    current_belt?: {
      // Added belt info to determine if My Level link should show
      id: string
      name: string
      display_order: number
      color: string
    } | null
  }
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = user.email === "acmyma@gmail.com"
  const isStudentView = typeof globalThis !== "undefined" && globalThis.location?.pathname === "/student-view"
  const isProfilePage = typeof globalThis !== "undefined" && globalThis.location?.pathname === "/profile"
  const showAdminView = isAdmin && (isStudentView || isProfilePage)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false)
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const handleSignOutClick = () => {
    router.push("/signout")
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-red-800/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-center">
                <span className="text-white font-bold text-sm leading-tight">
                  古<br />
                  武道
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Okinawa Kobudo </h1>
                <p className="text-xs text-gray-400">Training Video Library</p>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`transition-colors flex items-center space-x-1 ${
                pathname === "/"
                  ? "text-white font-semibold border-b-2 border-red-500 pb-1"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              <SquarePlay className="w-4 h-4" />
              <span>Library</span>
            </Link>
            {user.current_belt && (
              <Link
                href="/my-level"
                className={`transition-colors flex items-center space-x-1 ${
                  pathname === "/my-level"
                    ? "text-white font-semibold border-b-2 border-red-500 pb-1"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Ribbon className="w-4 h-4" />
                <span>My Level</span>
              </Link>
            )}
            <Link
              href="/favorites"
              className={`transition-colors flex items-center space-x-1 ${
                pathname === "/favorites"
                  ? "text-white font-semibold border-b-2 border-red-500 pb-1"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Favorites</span>
            </Link>
            {(user.role === "Teacher" || user.role === "Head Teacher") && (
              <Link
                href="/students"
                className={`transition-colors flex items-center space-x-1 ${
                  pathname === "/students"
                    ? "text-white font-semibold border-b-2 border-red-500 pb-1"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Students</span>
              </Link>
            )}
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
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>

            <NotificationBell userId={user.id} isAdmin={isAdmin} userRole={user.role} userEmail={user.email} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-12 w-12 rounded-full p-0 hover:bg-yellow-400/30 hover:scale-110 hover:shadow-lg hover:shadow-yellow-400/50 transition-all duration-300 border-2 border-transparent hover:border-yellow-400"
                >
                  <Avatar className="h-10 w-10">
                    {user.profile_image_url && (
                      <AvatarImage src={user.profile_image_url || "/placeholder.svg"} alt={user.full_name || "User"} />
                    )}
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
                {(user.role === "Teacher" || user.role === "Head Teacher") && (
                  <DropdownMenuItem
                    className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                    onClick={() => {
                      setIsInviteModalOpen(true)
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite User
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => setIsCurriculumModalOpen(true)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Curriculum
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => setIsContributeModalOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Contribute
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => setIsDonationModalOpen(true)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Donate
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
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={handleSignOutClick}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  onClick={() => setIsAboutModalOpen(true)}
                >
                  <Info className="mr-2 h-4 w-4" />
                  About
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/90 border-t border-red-800/30">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              <Link
                href="/"
                className={`block transition-colors py-2 px-3 rounded-md flex items-center space-x-2 ${
                  pathname === "/"
                    ? "text-white font-semibold bg-red-500/20 border-l-2 border-red-500"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <SquarePlay className="w-4 h-4" />
                <span>Library</span>
              </Link>
              {user.current_belt && (
                <Link
                  href="/my-level"
                  className={`block transition-colors py-2 px-3 rounded-md flex items-center space-x-2 ${
                    pathname === "/my-level"
                      ? "text-white font-semibold bg-red-500/20 border-l-2 border-red-500"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Ribbon className="w-4 h-4" />
                  <span>My Level</span>
                </Link>
              )}
              <Link
                href="/favorites"
                className={`block transition-colors py-2 px-3 rounded-md flex items-center space-x-2 ${
                  pathname === "/favorites"
                    ? "text-white font-semibold bg-red-500/20 border-l-2 border-red-500"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Heart className="w-4 h-4" />
                <span>Favorites</span>
              </Link>
              {(user.role === "Teacher" || user.role === "Head Teacher") && (
                <Link
                  href="/students"
                  className={`block transition-colors py-2 px-3 rounded-md flex items-center space-x-2 ${
                    pathname === "/students"
                      ? "text-white font-semibold bg-red-500/20 border-l-2 border-red-500"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  <span>Students</span>
                </Link>
              )}
              {showAdminView && (
                <Link
                  href="/admin"
                  className="block text-orange-400 hover:text-orange-300 transition-colors py-2 px-3 rounded-md hover:bg-orange-500/10 flex items-center space-x-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin View</span>
                </Link>
              )}
              {(user.role === "Teacher" || user.role === "Head Teacher") && (
                <Link
                  href="/invite-user"
                  className="block text-gray-300 hover:text-white transition-colors py-2 px-3 rounded-md hover:bg-white/10 flex items-center space-x-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite User</span>
                </Link>
              )}
              <Link
                href="/signout"
                className="block text-gray-300 hover:text-white transition-colors py-2 px-3 rounded-md hover:bg-white/10 flex items-center space-x-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <DonationModal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} />
      <CurriculumModal isOpen={isCurriculumModalOpen} onClose={() => setIsCurriculumModalOpen(false)} />
      <ContributeModal isOpen={isContributeModalOpen} onClose={() => setIsContributeModalOpen(false)} />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </>
  )
}
