import { LoadingSkeleton } from "@/components/loading-skeleton"

export default function Loading() {
  return <LoadingSkeleton showFilters={false} showTitle={true} gridCount={8} />
}
