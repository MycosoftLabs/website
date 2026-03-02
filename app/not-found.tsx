import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-dvh w-full px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[400px] w-full max-w-md flex-col justify-center rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page or resource you are looking for does not exist.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>The URL might be incorrect</li>
          <li>The content might have been moved or deleted</li>
          <li>The species or compound might not be in our database yet</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-transparent bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            Go Home
          </Link>
          <Link
            href="/species/submit"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60"
          >
            Submit New Species
          </Link>
        </div>
      </div>
    </div>
  )
}
