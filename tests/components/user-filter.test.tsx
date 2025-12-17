import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UserFilter from "@/components/user-filter"

describe("UserFilter", () => {
  const defaultProps = {
    roles: ["Student", "Teacher", "Head Teacher"],
    schools: ["School A", "School B", "School C"],
    belts: [
      { id: "belt-1", name: "White Belt", color: "#ffffff", display_order: 1 },
      { id: "belt-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 },
    ],
    selectedRole: "all",
    selectedSchool: "all",
    selectedBelt: "all",
    onRoleChange: vi.fn(),
    onSchoolChange: vi.fn(),
    onBeltChange: vi.fn(),
    userCount: 25,
  }

  it("should render filter controls", () => {
    render(<UserFilter {...defaultProps} />)

    expect(screen.getByText("Filter by")).toBeInTheDocument()
    expect(screen.getByText("Role:")).toBeInTheDocument()
    expect(screen.getByText("School:")).toBeInTheDocument()
    expect(screen.getByText("Belt:")).toBeInTheDocument()
  })

  it("should display user count", () => {
    render(<UserFilter {...defaultProps} />)

    expect(screen.getByText(/Showing 25 users/)).toBeInTheDocument()
  })

  it("should call onRoleChange when role is selected", async () => {
    const user = userEvent.setup()
    const onRoleChange = vi.fn()
    render(<UserFilter {...defaultProps} onRoleChange={onRoleChange} />)

    const roleTrigger = screen.getAllByRole("combobox")[0]
    await user.click(roleTrigger)

    const teacherOption = await screen.findByText("Teacher", {}, { timeout: 3000 })
    await user.click(teacherOption)

    expect(onRoleChange).toHaveBeenCalledWith("Teacher")
  })

  it("should call onSchoolChange when school is selected", async () => {
    const user = userEvent.setup()
    const onSchoolChange = vi.fn()
    render(<UserFilter {...defaultProps} onSchoolChange={onSchoolChange} />)

    const schoolTrigger = screen.getAllByRole("combobox")[1]
    await user.click(schoolTrigger)

    const schoolOption = await screen.findByText("School A", {}, { timeout: 3000 })
    await user.click(schoolOption)

    expect(onSchoolChange).toHaveBeenCalledWith("School A")
  })

  it("should call onBeltChange when belt is selected", async () => {
    const user = userEvent.setup()
    const onBeltChange = vi.fn()
    render(<UserFilter {...defaultProps} onBeltChange={onBeltChange} />)

    const beltTrigger = screen.getAllByRole("combobox")[2]
    await user.click(beltTrigger)

    const beltOption = await screen.findByText("White Belt", {}, { timeout: 3000 })
    await user.click(beltOption)

    expect(onBeltChange).toHaveBeenCalledWith("belt-1")
  })

  it("should show Clear All button when filters are active", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" />)

    expect(screen.getByRole("button", { name: /Clear All/i })).toBeInTheDocument()
  })

  it("should call clear functions when Clear All is clicked", async () => {
    const user = userEvent.setup()
    const onRoleChange = vi.fn()
    const onSchoolChange = vi.fn()
    const onBeltChange = vi.fn()

    render(
      <UserFilter
        {...defaultProps}
        selectedRole="Teacher"
        onRoleChange={onRoleChange}
        onSchoolChange={onSchoolChange}
        onBeltChange={onBeltChange}
      />,
    )

    const clearButton = screen.getByRole("button", { name: /Clear All/i })
    await user.click(clearButton)

    expect(onRoleChange).toHaveBeenCalledWith("all")
    expect(onSchoolChange).toHaveBeenCalledWith("all")
    expect(onBeltChange).toHaveBeenCalledWith("all")
  })

  it("should display active filter badges", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" selectedSchool="School A" />)

    expect(screen.getByText(/Role: Teacher/)).toBeInTheDocument()
    expect(screen.getByText(/School: School A/)).toBeInTheDocument()
  })

  it("should remove individual filter when badge is clicked", async () => {
    const user = userEvent.setup()
    const onRoleChange = vi.fn()
    render(<UserFilter {...defaultProps} selectedRole="Teacher" onRoleChange={onRoleChange} />)

    const roleBadge = screen.getByText(/Role: Teacher/).closest(".cursor-pointer")
    await user.click(roleBadge!)

    expect(onRoleChange).toHaveBeenCalledWith("all")
  })

  it("should show filter count in description when filters are active", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" selectedSchool="School A" />)

    expect(screen.getByText(/Showing 25 users matching: 2 filters/)).toBeInTheDocument()
  })
})
