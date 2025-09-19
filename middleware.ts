import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/pending-approval") {
    return
  }

  const response: NextResponse = await updateSession(request)

  if (response) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
    return response
  }

  // If no response from updateSession, create one with robots headers
  const newResponse = new Response()
  newResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
  return newResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
