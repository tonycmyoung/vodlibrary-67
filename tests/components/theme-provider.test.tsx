import type React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ThemeProvider } from "@/components/theme-provider"

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}))

describe("ThemeProvider", () => {
  it("should render children", () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>,
    )

    expect(screen.getByText("Test Child")).toBeTruthy()
  })

  it("should pass through props to NextThemesProvider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div>Test Child</div>
      </ThemeProvider>,
    )

    expect(screen.getByTestId("theme-provider")).toBeTruthy()
  })

  it("should render without errors when no children provided", () => {
    const { container } = render(<ThemeProvider />)

    expect(container.querySelector('[data-testid="theme-provider"]')).toBeTruthy()
  })
})
