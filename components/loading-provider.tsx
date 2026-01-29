"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
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

// Helper function to check if a link should be skipped (extracted to reduce nesting)
function shouldSkipLink(link: HTMLAnchorElement): boolean {
  return (
    link.href.startsWith("mailto:") ||
    link.href.startsWith("tel:") ||
    link.href.startsWith("#") ||
    link.target === "_blank"
  )
}

// Helper function to check if link is internal navigation (extracted to reduce nesting)
function isInternalNavigation(href: string): boolean {
  try {
    const url = new URL(href)
    const currentUrl = new URL(window.location.href)
    return url.origin === currentUrl.origin
  } catch {
    return false
  }
}

// Helper function to determine if loading should be shown for a click event
function shouldShowLoadingForClick(target: HTMLElement): boolean {
  // Skip form elements and elements marked with data-no-loading
  if (target.closest("input, select, textarea, [data-no-loading]")) {
    return false
  }

  const link = target.closest("a[href]") as HTMLAnchorElement
  const navButton = target.closest("[data-navigate]") as HTMLElement

  if (link?.href) {
    if (shouldSkipLink(link)) {
      return false
    }
    return isInternalNavigation(link.href)
  }

  // Show loading for elements marked with data-navigate
  return !!navButton
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsLoading(false)
    setShowSpinner(false)
  }, [pathname])

  // Callback to show spinner if still loading (extracted to reduce nesting)
  const showSpinnerIfLoading = useCallback(() => {
    setIsLoading((current) => {
      if (current) {
        setShowSpinner(true)
      }
      return current
    })
  }, [])

  // Callback to clear loading state (extracted to reduce nesting)
  const clearLoadingState = useCallback(() => {
    setIsLoading(false)
    setShowSpinner(false)
  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let clearTimeoutId: NodeJS.Timeout

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (!shouldShowLoadingForClick(target)) {
        return
      }

      setIsLoading(true)

      // Show spinner after 200ms delay
      timeoutId = setTimeout(showSpinnerIfLoading, 200)

      // Auto-clear after 10 seconds as fallback
      clearTimeoutId = setTimeout(clearLoadingState, 10000)
    }

    document.addEventListener("click", handleClick, true) // Use capture phase

    return () => {
      document.removeEventListener("click", handleClick, true)
      if (timeoutId) clearTimeout(timeoutId)
      if (clearTimeoutId) clearTimeout(clearTimeoutId)
    }
  }, [showSpinnerIfLoading, clearLoadingState])

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
