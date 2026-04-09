import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import Loading from "@/app/loading"
import FavoritesLoading from "@/app/favorites/loading"
import MyLevelLoading from "@/app/my-level/loading"

describe("Loading Pages", () => {
  describe("Main Loading (/)", () => {
    it("should render loading skeleton", () => {
      const { container } = render(<Loading />)

      // Check for gradient background
      expect(container.querySelector('[class*="bg-gradient"]')).toBeTruthy()

      // Check for skeleton elements
      const skeletons = container.querySelectorAll(".animate-pulse")
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("should render header skeleton", () => {
      const { container } = render(<Loading />)

      // Check for header area
      const headerSkeleton = container.querySelector('[class*="h-16"]')
      expect(headerSkeleton).toBeTruthy()
    })

    it("should render video card skeletons in grid", () => {
      const { container } = render(<Loading />)

      // Check for grid layout
      const grid = container.querySelector(".grid")
      expect(grid).toBeTruthy()

      // Should have multiple card skeletons (12 in grid)
      const cardSkeletons = container.querySelectorAll(".rounded-lg.bg-black\\/30")
      expect(cardSkeletons.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe("Favorites Loading (/favorites)", () => {
    it("should render loading skeleton with favorites title placeholder", () => {
      const { container } = render(<FavoritesLoading />)

      // Check for main structure
      expect(container.querySelector('[class*="bg-gradient"]')).toBeTruthy()

      // Check for skeleton elements
      const skeletons = container.querySelectorAll(".animate-pulse")
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("should have similar structure to main loading", () => {
      const mainContainer = render(<Loading />).container
      const favContainer = render(<FavoritesLoading />).container

      // Both should have gradient backgrounds
      expect(mainContainer.querySelector('[class*="bg-gradient"]')).toBeTruthy()
      expect(favContainer.querySelector('[class*="bg-gradient"]')).toBeTruthy()

      // Both should have grids for video cards
      expect(mainContainer.querySelector(".grid")).toBeTruthy()
      expect(favContainer.querySelector(".grid")).toBeTruthy()
    })
  })

  describe("My Level Loading (/my-level)", () => {
    it("should render loading skeleton", () => {
      const { container } = render(<MyLevelLoading />)

      // Check for main structure
      expect(container.querySelector('[class*="bg-gradient"]')).toBeTruthy()

      // Check for skeleton elements
      const skeletons = container.querySelectorAll(".animate-pulse")
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("should render grid for video cards", () => {
      const { container } = render(<MyLevelLoading />)

      const grid = container.querySelector(".grid")
      expect(grid).toBeTruthy()
    })
  })

  describe("Responsive Design", () => {
    it("should have responsive grid classes in all loading pages", () => {
      const pages = [
        { name: "Main", component: <Loading /> },
        { name: "Favorites", component: <FavoritesLoading /> },
        { name: "My Level", component: <MyLevelLoading /> },
      ]

      pages.forEach(({ name: _name, component }) => {
        const { container } = render(component)
        const grid = container.querySelector(".grid")

        expect(grid?.className).toContain("grid-cols-1")
        expect(grid?.className).toContain("sm:grid-cols-2")
        expect(grid?.className).toContain("md:grid-cols-3")
        expect(grid?.className).toContain("lg:grid-cols-4")
      })
    })
  })
})
