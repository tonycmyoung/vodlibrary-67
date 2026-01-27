/**
 * Validates and sanitizes a returnTo parameter for safe redirects
 * @param returnTo - The returnTo parameter from URL or form data
 * @returns Validated and decoded path or null if invalid
 */
export function validateReturnTo(returnTo: string | null | undefined): string | null {
  if (!returnTo || typeof returnTo !== "string") {
    return null
  }

  // Decode URL-encoded values first to handle cases like %2Fwww.
  let decoded: string
  try {
    decoded = decodeURIComponent(returnTo.trim())
  } catch {
    // Invalid URL encoding - reject
    return null
  }

  // Must be a relative path starting with /
  if (!decoded.startsWith("/")) {
    return null
  }

  // Cannot contain protocol or domain (prevent open redirect)
  if (decoded.includes("://") || decoded.includes("//")) {
    return null
  }

  // Reject paths that look like domains or contain www.
  // This catches malformed redirects from external redirectors (e.g., Cloudflare)
  if (/^\/?(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(decoded)) {
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
  if (excludedPaths.includes(decoded)) {
    return null
  }

  // Check if starts with excluded prefixes
  const excludedPrefixes = ["/auth/", "/admin/", "/api/"]
  for (const prefix of excludedPrefixes) {
    if (decoded.startsWith(prefix)) {
      return null
    }
  }

  // Return the decoded value for clean paths
  return decoded
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
