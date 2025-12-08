import { redirect } from "next/navigation"

export default async function PerformersPage() {
  redirect("/admin/metadata")
}
