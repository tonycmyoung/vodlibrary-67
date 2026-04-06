export type CurrentBelt = {
  id: string
  name: string
  display_order: number
  color: string
}

type UserProfile = {
  full_name?: string | null
  is_approved?: boolean | null
  profile_image_url?: string | null
  role?: string | null
}

type AuthUser = {
  id: string
  email?: string | null
}

/**
 * Builds the user object expected by AdminHeader from Supabase auth user + profile.
 * Extracted to avoid repeating the same field mapping across every admin page.
 */
export function buildAdminHeaderUser(user: AuthUser, profile: UserProfile | null, defaultRole = "Admin") {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: profile?.full_name ?? null,
    is_approved: profile?.is_approved ?? false,
    profile_image_url: profile?.profile_image_url ?? null,
    role: profile?.role ?? defaultRole,
  }
}
