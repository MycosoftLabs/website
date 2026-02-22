import { Button } from "@/components/ui/button"

interface DeviceBulkActionsProps {
  selectedCount: number
  isBusy: boolean
  onSendCommand: () => void
  onRemove: () => void
  onExport: () => void
  onClear: () => void
}

export function DeviceBulkActions({
  selectedCount,
  isBusy,
  onSendCommand,
  onRemove,
  onExport,
  onClear,
}: DeviceBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="secondary"
        className="min-h-[44px]"
        onClick={onSendCommand}
        disabled={isBusy}
      >
        Send Command
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px]"
        onClick={onExport}
        disabled={isBusy}
      >
        Export JSON
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="min-h-[44px]"
        onClick={onRemove}
        disabled={isBusy}
      >
        Remove
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="min-h-[44px]"
        onClick={onClear}
        disabled={isBusy}
      >
        Clear
      </Button>
    </div>
  )
}
