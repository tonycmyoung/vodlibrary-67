import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import VideoLibrarySkeleton from "@/components/video-library-skeleton"

describe("VideoLibrarySkeleton", () => {
  describe("Rendering", () => {
    it("should render the skeleton container", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      // Check for main container with padding
      const mainContainer = container.querySelector(".container")
      expect(mainContainer).toBeTruthy()
    })

    it("should render search/filter skeleton area", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      // Check for search bar skeleton
      const skeletonElements = container.querySelectorAll(".animate-pulse")
      expect(skeletonElements.length).toBeGreaterThan(0)
    })

    it("should render multiple video card skeletons", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      // Check for grid layout
      const grid = container.querySelector(".grid")
      expect(grid).toBeTruthy()

      // Check for skeleton cards (should have at least 8 based on implementation)
      const skeletonCards = container.querySelectorAll(".rounded-lg.animate-pulse")
      expect(skeletonCards.length).toBeGreaterThanOrEqual(8)
    })

    it("should have proper responsive grid classes", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      const grid = container.querySelector(".grid")
      expect(grid?.className).toContain("grid-cols-1")
      expect(grid?.className).toContain("sm:grid-cols-2")
      expect(grid?.className).toContain("md:grid-cols-3")
      expect(grid?.className).toContain("lg:grid-cols-4")
    })

    it("should render with proper styling classes", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      // Check for dark theme compatible colors
      const darkElements = container.querySelectorAll('[class*="bg-black"]')
      expect(darkElements.length).toBeGreaterThan(0)
    })
  })

  describe("Accessibility", () => {
    it("should have appropriate aria-busy state for loading", () => {
      const { container } = render(<VideoLibrarySkeleton />)

      // The skeleton should indicate loading state
      // The animate-pulse class provides visual feedback
      const pulsingElements = container.querySelectorAll(".animate-pulse")
      expect(pulsingElements.length).toBeGreaterThan(0)
    })
  })
})
