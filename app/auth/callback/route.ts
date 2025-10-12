import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  if (error) {
    if (error === "access_denied" && errorDescription?.includes("expired")) {
      return NextResponse.redirect(new URL("/auth/login?error=expired", request.url))
    }
    return NextResponse.redirect(new URL("/auth/login?error=auth_failed", request.url))
  }

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // This will be handled by the response
          },
        },
      },
    )

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("Auth exchange error:", exchangeError)
        return NextResponse.redirect(new URL("/auth/login?error=exchange_failed", request.url))
      }

      if (data.session?.user) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, is_approved")
          .eq("id", data.session.user.id)
          .single()

        if (!existingUser) {
          const response = NextResponse.redirect(new URL("/auth/sign-up?invited=true", request.url))

          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session) {
            response.cookies.set("sb-access-token", session.access_token, {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
            response.cookies.set("sb-refresh-token", session.refresh_token, {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
          }

          return response
        } else {
          const response = NextResponse.redirect(new URL("/", request.url))

          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session) {
            response.cookies.set("sb-access-token", session.access_token, {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
            response.cookies.set("sb-refresh-token", session.refresh_token, {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
          }

          return response
        }
      }
    } catch (error) {
      console.error("Callback processing error:", error)
      return NextResponse.redirect(new URL("/auth/login?error=callback_failed", request.url))
    }
  }

  return NextResponse.redirect(new URL("/auth/login", request.url))
}
