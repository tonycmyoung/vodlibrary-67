import { describe, it, expect } from "vitest"
import { buildAdminHeaderUser } from "@/lib/utils/admin-header-user"

const baseUser = { id: "user-123", email: "test@example.com" }

describe("buildAdminHeaderUser", () => {
  it("maps all fields from user and profile", () => {
    const profile = {
      full_name: "Jane Doe",
      is_approved: true,
      profile_image_url: "https://example.com/avatar.png",
      role: "Admin",
    }
    expect(buildAdminHeaderUser(baseUser, profile)).toEqual({
      id: "user-123",
      email: "test@example.com",
      full_name: "Jane Doe",
      is_approved: true,
      profile_image_url: "https://example.com/avatar.png",
      role: "Admin",
    })
  })

  it("falls back to defaults when profile is null", () => {
    const result = buildAdminHeaderUser(baseUser, null)
    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      full_name: null,
      is_approved: false,
      profile_image_url: null,
      role: "Admin",
    })
  })

  it("uses empty string when user email is undefined", () => {
    const result = buildAdminHeaderUser({ id: "user-123" }, null)
    expect(result.email).toBe("")
  })

  it("uses provided defaultRole when profile has no role", () => {
    const result = buildAdminHeaderUser(baseUser, { role: null }, "Instructor")
    expect(result.role).toBe("Instructor")
  })

  it("profile role takes precedence over defaultRole", () => {
    const result = buildAdminHeaderUser(baseUser, { role: "SuperAdmin" }, "Admin")
    expect(result.role).toBe("SuperAdmin")
  })

  it("handles partial profile with only some fields set", () => {
    const result = buildAdminHeaderUser(baseUser, { full_name: "Partial User" })
    expect(result.full_name).toBe("Partial User")
    expect(result.is_approved).toBe(false)
    expect(result.profile_image_url).toBeNull()
    expect(result.role).toBe("Admin")
  })
})
