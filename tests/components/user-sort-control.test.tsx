import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UserSortControl from "@/components/user-sort-control"

describe("UserSortControl", () => {
  it("should render sort label and controls", () => {
    const onSortChange = vi.fn()
    render(<UserSortControl sortBy="full_name" sortOrder="asc" onSortChange={onSortChange} />)

    expect(screen.getByText("Sort by:")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("should display current sort option", () => {
    const onSortChange = vi.fn()
    render(<UserSortControl sortBy="full_name" sortOrder="asc" onSortChange={onSortChange} />)

    expect(screen.getByRole("combobox")).toHaveTextContent("Name")
  })

  it("should call onSortChange when sort option changes", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<UserSortControl sortBy="full_name" sortOrder="asc" onSortChange={onSortChange} />)

    const selectTrigger = screen.getByRole("combobox")
    await user.click(selectTrigger)

    const lastLoginOption = await screen.findByText("Last Login", {}, { timeout: 3000 })
    await user.click(lastLoginOption)

    expect(onSortChange).toHaveBeenCalledWith("last_login", "asc")
  })

  it("should toggle sort order when arrow button is clicked", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<UserSortControl sortBy="full_name" sortOrder="asc" onSortChange={onSortChange} />)

    const toggleButton = screen.getByRole("button", { name: /sort descending/i })
    await user.click(toggleButton)

    expect(onSortChange).toHaveBeenCalledWith("full_name", "desc")
  })

  it("should show correct tooltip based on sort order", () => {
    const onSortChange = vi.fn()
    const { rerender } = render(<UserSortControl sortBy="full_name" sortOrder="asc" onSortChange={onSortChange} />)

    expect(screen.getByTitle("Sort descending")).toBeInTheDocument()

    rerender(<UserSortControl sortBy="full_name" sortOrder="desc" onSortChange={onSortChange} />)
    expect(screen.getByTitle("Sort ascending")).toBeInTheDocument()
  })
})
