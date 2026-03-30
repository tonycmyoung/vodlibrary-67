import { LoadingSkeleton } from "@/components/loading-skeleton"

export default function Loading() {
  return <LoadingSkeleton showFilters={true} gridCount={12} filterCount={6} />
}
