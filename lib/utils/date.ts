export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === "") {
    return "No date"
  }

  try {
    const hasTimezone = dateString.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(dateString)

    const processedString = hasTimezone ? dateString : dateString + "Z"

    const date = new Date(processedString)

    if (Number.isNaN(date.getTime())) {
      return "Invalid date"
    }

    const result = date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // switched from 12-hour to 24-hour format
    })

    return result
  } catch {
    return "Invalid date"
  }
}

export const formatShortDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === "") {
    return "No date"
  }

  try {
    const hasTimezone = dateString.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(dateString)

    const date = new Date(hasTimezone ? dateString : dateString + "Z")

    if (Number.isNaN(date.getTime())) {
      return "Invalid date"
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "Invalid date"
  }
}

export const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === "") {
    return "No date"
  }

  try {
    const now = new Date()
    const hasTimezone = dateString.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(dateString)

    const date = new Date(hasTimezone ? dateString : dateString + "Z")

    if (Number.isNaN(date.getTime())) {
      return "Invalid date"
    }

    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 2592000)} months ago`
  } catch {
    return "Invalid date"
  }
}

export const formatMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("default", {
    month: "short",
  }).format(date)
}
