import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LegalFooter } from "@/components/legal-footer"

describe("LegalFooter", () => {
  it("should render footer element with copyright text", () => {
    render(<LegalFooter />)

    const currentYear = new Date().getFullYear()
    const footer = screen.getByRole("contentinfo")

    expect(footer).toBeInTheDocument()
    expect(screen.getByText(`© ${currentYear} Tony Young. All rights reserved.`)).toBeInTheDocument()
  })

  it("should render EULA link with correct attributes", () => {
    render(<LegalFooter />)

    const eulaLink = screen.getByRole("link", { name: /end user license agreement/i })

    expect(eulaLink).toHaveAttribute("href", "/eula")
    expect(eulaLink).toHaveAttribute("target", "_blank")
    expect(eulaLink).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("should render Privacy Policy link with correct attributes", () => {
    render(<LegalFooter />)

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i })

    expect(privacyLink).toHaveAttribute("href", "/privacy-policy")
    expect(privacyLink).toHaveAttribute("target", "_blank")
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("should render both legal links", () => {
    render(<LegalFooter />)

    expect(screen.getByRole("link", { name: /end user license agreement/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument()
  })

  it("should display current year in copyright text", () => {
    const currentYear = new Date().getFullYear()
    render(<LegalFooter />)

    expect(screen.getByText(`© ${currentYear} Tony Young. All rights reserved.`)).toBeInTheDocument()
  })
})
