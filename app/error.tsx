import ErrorClient from "@/components/error-client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Forward everything to a Client component for interactivity
  return <ErrorClient error={error} reset={reset} />
}
