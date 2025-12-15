"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsLoading(false)
    setShowSpinner(false)
  }, [pathname])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let clearTimeoutId: NodeJS.Timeout

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if click is on a navigation element
      const link = target.closest("a[href]") as HTMLAnchorElement
      const navButton = target.closest("[data-navigate]") as HTMLElement

      if (target.closest("input, select, textarea, [data-no-loading]")) {
        return
      }

      let shouldShowLoading = false

      if (link?.href) {
        // Skip external links, mailto, tel, and hash links
        if (
          link.href.startsWith("mailto:") ||
          link.href.startsWith("tel:") ||
          link.href.startsWith("#") ||
          link.target === "_blank"
        ) {
          return
        }

        try {
          const url = new URL(link.href)
          const currentUrl = new URL(window.location.href)

          // Show loading for internal navigation (including same page with different params)
          if (url.origin === currentUrl.origin) {
            shouldShowLoading = true
          }
        } catch {
          // Invalid URL, skip
          return
        }
      } else if (navButton) {
        // Show loading for elements marked with data-navigate
        shouldShowLoading = true
      }

      if (shouldShowLoading) {
        setIsLoading(true)

        // Show spinner after 200ms delay
        timeoutId = setTimeout(() => {
          setIsLoading((current) => {
            if (current) {
              setShowSpinner(true)
            }
            return current
          })
        }, 200)

        // Auto-clear after 10 seconds as fallback
        clearTimeoutId = setTimeout(() => {
          setIsLoading(false)
          setShowSpinner(false)
        }, 10000)
      }
    }

    document.addEventListener("click", handleClick, true) // Use capture phase

    return () => {
      document.removeEventListener("click", handleClick, true)
      if (timeoutId) clearTimeout(timeoutId)
      if (clearTimeoutId) clearTimeout(clearTimeoutId)
    }
  }, [])

  const setLoading = (loading: boolean) => {
    setIsLoading(loading)
    if (!loading) {
      setShowSpinner(false)
    }
  }

  const contextValue = useMemo(() => ({ isLoading, setLoading }), [isLoading])

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {showSpinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-gray-900/90 p-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium text-gray-200">Loading...</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  )
}
