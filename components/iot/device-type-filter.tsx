import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DeviceTypeFilterProps {
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function DeviceTypeFilter({
  value,
  options,
  onChange,
}: DeviceTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full text-base md:w-52">
        <SelectValue placeholder="All device types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All device types</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
