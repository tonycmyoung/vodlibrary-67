import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ViewToggle from "@/components/view-toggle"

describe("ViewToggle", () => {
  it("should render grid and list buttons", () => {
    const onViewChange = vi.fn()
    render(<ViewToggle view="grid" onViewChange={onViewChange} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(2)
  })

  it("should highlight grid button when view is grid", () => {
    const onViewChange = vi.fn()
    const { container } = render(<ViewToggle view="grid" onViewChange={onViewChange} />)

    const gridButton = screen.getAllByRole("button")[0]
    expect(gridButton).toHaveClass("bg-red-600")
  })

  it("should highlight list button when view is list", () => {
    const onViewChange = vi.fn()
    const { container } = render(<ViewToggle view="list" onViewChange={onViewChange} />)

    const listButton = screen.getAllByRole("button")[1]
    expect(listButton).toHaveClass("bg-red-600")
  })

  it("should call onViewChange with grid when grid button is clicked", async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<ViewToggle view="list" onViewChange={onViewChange} />)

    const gridButton = screen.getAllByRole("button")[0]
    await user.click(gridButton)

    expect(onViewChange).toHaveBeenCalledWith("grid")
  })

  it("should call onViewChange with list when list button is clicked", async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<ViewToggle view="grid" onViewChange={onViewChange} />)

    const listButton = screen.getAllByRole("button")[1]
    await user.click(listButton)

    expect(onViewChange).toHaveBeenCalledWith("list")
  })
})
