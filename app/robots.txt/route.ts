export function GET() {
  return new Response(
    `User-agent: *
Disallow: /

# This is a private library system
# requiring membership approval
`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    },
  )
}
