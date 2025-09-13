import type React from "react"
import type { Metadata } from "next"
import { Geist, Manrope } from "next/font/google"
import "./globals.css"
import { LoadingProvider } from "@/components/loading-provider"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
})

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  title: "Okinawa Kobudo Library",
  description: "Traditional Kobudo Training Video Library",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${manrope.variable} antialiased`}>
      <body>
        <LoadingProvider>{children}</LoadingProvider>
      </body>
    </html>
  )
}
