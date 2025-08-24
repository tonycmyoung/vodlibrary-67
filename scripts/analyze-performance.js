// Script to fetch and analyze Supabase performance warnings
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Supabase%20Performance%20Security%20Lints%20%28mjngcvwkoqrmegnuuxum%29-yeQI0N5eL4f25AyWGBiJ1nlZSzr5Hk.csv"

async function analyzePerformanceIssues() {
  try {
    console.log("Fetching Supabase performance data...")
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("CSV Data received, length:", csvText.length)

    // Parse CSV manually (simple approach)
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""))

    console.log("Headers:", headers)
    console.log("Total issues found:", lines.length - 1)

    const issues = []
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        // Simple CSV parsing - may need adjustment for complex fields
        const values = lines[i].split(",")
        const issue = {}
        headers.forEach((header, index) => {
          issue[header] = values[index] ? values[index].replace(/"/g, "") : ""
        })
        issues.push(issue)
      }
    }

    // Analyze issues by category
    const performanceIssues = issues.filter((issue) => issue.categories && issue.categories.includes("PERFORMANCE"))

    const securityIssues = issues.filter((issue) => issue.categories && issue.categories.includes("SECURITY"))

    console.log("\n=== PERFORMANCE ISSUES ===")
    console.log("Count:", performanceIssues.length)

    performanceIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title} (${issue.level})`)
      console.log(`   Description: ${issue.description}`)
      console.log(`   Detail: ${issue.detail}`)
      console.log(`   Remediation: ${issue.remediation}`)
    })

    console.log("\n=== SECURITY ISSUES ===")
    console.log("Count:", securityIssues.length)

    securityIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title} (${issue.level})`)
      console.log(`   Description: ${issue.description}`)
      console.log(`   Detail: ${issue.detail}`)
    })

    // Group by table/component for easier analysis
    const byTable = {}
    issues.forEach((issue) => {
      if (issue.metadata) {
        try {
          const metadata = JSON.parse(issue.metadata)
          const tableName = metadata.name || "unknown"
          if (!byTable[tableName]) byTable[tableName] = []
          byTable[tableName].push(issue)
        } catch (e) {
          // Skip if metadata parsing fails
        }
      }
    })

    console.log("\n=== ISSUES BY TABLE ===")
    Object.entries(byTable).forEach(([table, tableIssues]) => {
      console.log(`\n${table}: ${tableIssues.length} issues`)
      tableIssues.forEach((issue) => {
        console.log(`  - ${issue.title} (${issue.level})`)
      })
    })
  } catch (error) {
    console.error("Error analyzing performance data:", error)
  }
}

analyzePerformanceIssues()
