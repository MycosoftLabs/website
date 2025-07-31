import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Compounds Not Found</AlertTitle>
        <AlertDescription>The compounds directory is currently unavailable or empty.</AlertDescription>
      </Alert>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  )
}
