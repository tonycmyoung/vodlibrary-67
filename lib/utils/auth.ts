/**
 * Validates and sanitizes a returnTo parameter for safe redirects
 * @param returnTo - The returnTo parameter from URL or form data
 * @returns Validated path or null if invalid
 */
export function validateReturnTo(returnTo: string | null | undefined): string | null {
  if (!returnTo || typeof returnTo !== "string") {
    return null
  }

  // Must be a relative path starting with /
  if (!returnTo.startsWith("/")) {
    return null
  }

  // Cannot contain protocol or domain (prevent open redirect)
  if (returnTo.includes("://") || returnTo.includes("//")) {
    return null
  }

  // Excluded paths that should not be used as returnTo
  const excludedPaths = [
    "/",
    "/auth/login",
    "/auth/sign-up",
    "/auth/callback",
    "/auth/confirm",
    "/auth/confirm/callback",
    "/auth/reset-password",
    "/pending-approval",
    "/setup-admin",
  ]

  // Check exact matches
  if (excludedPaths.includes(returnTo)) {
    return null
  }

  // Check if starts with excluded prefixes
  const excludedPrefixes = ["/auth/", "/admin/", "/api/"]
  for (const prefix of excludedPrefixes) {
    if (returnTo.startsWith(prefix)) {
      return null
    }
  }

  return returnTo
}

/**
 * Gets error message for display based on error code
 * @param errorCode - The error code from URL params
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(errorCode: string | null | undefined): string | null {
  if (!errorCode) {
    return null
  }

  const errorMessages: Record<string, string> = {
    invalid_credentials: "Invalid email or password. Please check your credentials and try again.",
    email_not_confirmed: "Please check your email and click the confirmation link before signing in.",
    invalid_return_path: "Invalid redirect destination. Please try again.",
    auth_error: "An authentication error occurred. Please try again.",
    reset_expired: "Your password reset link has expired or is invalid. Please request a new one.",
  }

  const message = errorMessages[errorCode] || "An unexpected error occurred. Please try again."
  return message
}
