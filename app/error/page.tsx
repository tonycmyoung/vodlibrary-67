"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ErrorPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function ErrorPage({ searchParams }: ErrorPageProps) {
  const router = useRouter()
  const errorType = searchParams.type as string
  const message = searchParams.message as string

  const getErrorContent = () => {
    switch (errorType) {
      case "auth":
        return {
          title: "Authentication Error",
          description: "There was a problem with your authentication. Please sign in again.",
          action: "Sign In",
          href: "/auth/login",
        }
      case "session":
        return {
          title: "Session Expired",
          description: "Your session has expired for security reasons. Please sign in again.",
          action: "Sign In",
          href: "/auth/login",
        }
      case "permission":
        return {
          title: "Access Denied",
          description: "You do not have permission to access this resource.",
          action: "Go Home",
          href: "/",
        }
      case "server":
        return {
          title: "Server Error",
          description: "An unexpected server error occurred. Please try again later.",
          action: "Try Again",
          href: null,
        }
      default:
        return {
          title: "Something Went Wrong",
          description: message || "An unexpected error occurred. Please try again.",
          action: "Go Home",
          href: "/",
        }
    }
  }

  const errorContent = getErrorContent()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-lg p-8 text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{errorContent.title}</h1>
          <p className="text-gray-300">{errorContent.description}</p>
        </div>

        <div className="space-y-3">
          {errorContent.href ? (
            <Link href={errorContent.href}>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">{errorContent.action}</Button>
            </Link>
          ) : (
            <Button onClick={() => router.refresh()} className="w-full bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              {errorContent.action}
            </Button>
          )}

          <Link href="/">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
