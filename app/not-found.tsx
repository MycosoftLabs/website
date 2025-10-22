import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileQuestion className="h-5 w-5" />
            <CardTitle>Not Found</CardTitle>
          </div>
          <CardDescription>The page or resource you're looking for doesn't exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This could be because:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>The URL might be incorrect</li>
            <li>The content might have been moved or deleted</li>
            <li>The species or compound might not be in our database yet</li>
          </ul>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/species/submit">Submit New Species</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
