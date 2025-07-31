"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MouseIcon as Mushroom, FileText, FlaskRoundIcon as Flask, Microscope } from "lucide-react"
import { useSearch } from "./search/use-search"
import { searchTracker } from "@/lib/services/search-tracker"

export function CommandSearch({ ...props }: DialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const { query, setQuery, suggestions, isLoading, fetchSuggestions } = useSearch()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative h-10 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-96 lg:w-[30rem]"
        onClick={() => setOpen(true)}
        {...props}
      >
        <span className="inline-flex">
          <Search className="mr-2 h-4 w-4" />
          Press to search or use commands...
        </span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-8 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search fungi, compounds, research..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {isLoading && (
              <div className="py-6 text-center text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                Searching...
              </div>
            )}
            {!isLoading && suggestions.length === 0 && query && (
              <div className="py-6 text-center text-sm">No results found for "{query}"</div>
            )}
            {!isLoading && suggestions.length === 0 && !query && (
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => runCommand(() => router.push("/natureos"))}>
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <span className="h-3 w-3 rounded-sm bg-primary"></span>
                  </div>
                  <span>NatureOS Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/myca-ai"))}>
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <span className="h-3 w-3 rounded-sm bg-primary"></span>
                  </div>
                  <span>Open Myca AI</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/devices"))}>
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <span className="h-3 w-3 rounded-sm bg-primary"></span>
                  </div>
                  <span>Browse Devices</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/apps"))}>
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <span className="h-3 w-3 rounded-sm bg-primary"></span>
                  </div>
                  <span>Explore Apps</span>
                </CommandItem>
              </CommandGroup>
            )}
            {!isLoading && suggestions.length > 0 && (
              <CommandGroup heading="Search Results">
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.id}
                    onSelect={() => {
                      runCommand(() => {
                        searchTracker.trackResultClick(query, suggestion.type)
                        router.push(suggestion.url)
                      })
                    }}
                  >
                    {suggestion.type === "fungi" && <Mushroom className="mr-2 h-4 w-4 text-green-500" />}
                    {suggestion.type === "article" && <FileText className="mr-2 h-4 w-4 text-blue-500" />}
                    {suggestion.type === "compound" && <Flask className="mr-2 h-4 w-4 text-purple-500" />}
                    {suggestion.type === "research" ||
                      (suggestion.type === "category" && <Microscope className="mr-2 h-4 w-4 text-orange-500" />)}
                    <span>{suggestion.title}</span>
                    {suggestion.scientificName && (
                      <span className="ml-2 text-muted-foreground text-xs italic">{suggestion.scientificName}</span>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      {suggestion.type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <div className="mt-2 px-3 py-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press ⌘K to open commands</span>
                <span>ESC to cancel</span>
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CommandProps {
  children?: React.ReactNode
  className?: string
}

const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, CommandProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className,
      )}
      {...props}
    />
  ),
)
Command.displayName = CommandPrimitive.displayName

interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {}

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
CommandInput.displayName = CommandPrimitive.Input.displayName

interface CommandItemProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {}

const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, CommandItemProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
CommandItem.displayName = CommandPrimitive.Item.displayName

interface CommandGroupProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> {}

const CommandGroup = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Group>, CommandGroupProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
)
CommandGroup.displayName = CommandPrimitive.Group.displayName
