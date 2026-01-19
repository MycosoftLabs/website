"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, TrendingDown, Minus, ExternalLink, Info, CheckCircle, AlertTriangle, XCircle,
  type LucideIcon
} from "lucide-react"

import {
  type Component,
  type Widget,
  type TextComponent,
  type StatsCardComponent,
  type DataTableComponent,
  type ListComponent,
  type ChartComponent,
  type ProgressComponent,
  type ButtonComponent,
  type FormComponent,
  type AlertComponent,
  type GridComponent,
  type CardComponent,
  type TabsComponent,
  type ImageComponent,
  validateWidget,
} from "@/lib/ai/json-render-catalog"

interface DynamicWidgetProps {
  /** JSON widget definition from AI */
  widget: Widget | unknown
  /** Callback when a button action is triggered */
  onAction?: (actionId: string, data?: unknown) => void
  /** Callback when a form is submitted */
  onFormSubmit?: (formId: string, data: Record<string, unknown>) => void
  /** Additional className for the widget container */
  className?: string
  /** Show validation errors instead of failing silently */
  showErrors?: boolean
}

/**
 * DynamicWidget - Renders AI-generated UI from JSON
 * 
 * @example
 * <DynamicWidget
 *   widget={mycaResponse.widget}
 *   onAction={(id) => handleAction(id)}
 * />
 */
export function DynamicWidget({
  widget,
  onAction,
  onFormSubmit,
  className,
  showErrors = false,
}: DynamicWidgetProps) {
  // Validate the widget
  const validatedWidget = useMemo(() => {
    const result = validateWidget(widget)
    if (!result && showErrors) {
      console.error("Invalid widget JSON:", widget)
    }
    return result
  }, [widget, showErrors])

  if (!validatedWidget) {
    if (showErrors) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Invalid Widget</AlertTitle>
          <AlertDescription>
            The AI-generated widget could not be rendered due to invalid JSON structure.
          </AlertDescription>
        </Alert>
      )
    }
    return null
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {(validatedWidget.title || validatedWidget.description) && (
        <CardHeader className="pb-2">
          {validatedWidget.title && <CardTitle>{validatedWidget.title}</CardTitle>}
          {validatedWidget.description && (
            <CardDescription>{validatedWidget.description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {validatedWidget.components.map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            onAction={onAction}
            onFormSubmit={onFormSubmit}
          />
        ))}
      </CardContent>
      {validatedWidget.actions && validatedWidget.actions.length > 0 && (
        <CardFooter className="gap-2 border-t pt-4">
          {validatedWidget.actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => onAction?.(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </CardFooter>
      )}
    </Card>
  )
}

// Component renderer for each type
interface ComponentRendererProps {
  component: Component
  onAction?: (actionId: string, data?: unknown) => void
  onFormSubmit?: (formId: string, data: Record<string, unknown>) => void
}

function ComponentRenderer({ component, onAction, onFormSubmit }: ComponentRendererProps) {
  if (!component.visible) return null

  switch (component.type) {
    case "text":
      return <TextRenderer component={component} />
    case "link":
      return (
        <a
          href={component.href}
          target={component.external ? "_blank" : undefined}
          rel={component.external ? "noopener noreferrer" : undefined}
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {component.text}
          {component.external && <ExternalLink className="h-3 w-3" />}
        </a>
      )
    case "stats-card":
      return <StatsCardRenderer component={component} />
    case "data-table":
      return <DataTableRenderer component={component} />
    case "list":
      return <ListRenderer component={component} />
    case "chart":
      return <ChartPlaceholder component={component} />
    case "progress":
      return <ProgressRenderer component={component} />
    case "button":
      return (
        <Button
          variant={component.variant as any}
          disabled={component.disabled}
          onClick={() => onAction?.(component.action)}
        >
          {component.label}
        </Button>
      )
    case "form":
      return <FormRenderer component={component} onSubmit={onFormSubmit} />
    case "alert":
      return <AlertRenderer component={component} />
    case "grid":
      return (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${component.columns}, 1fr)` }}
        >
          {component.children.map((child: Component) => (
            <ComponentRenderer key={child.id} component={child} onAction={onAction} onFormSubmit={onFormSubmit} />
          ))}
        </div>
      )
    case "card":
      return <CardRenderer component={component} onAction={onAction} onFormSubmit={onFormSubmit} />
    case "tabs":
      return <TabsRenderer component={component} onAction={onAction} onFormSubmit={onFormSubmit} />
    case "divider":
      return component.label ? (
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
            {component.label}
          </span>
        </div>
      ) : (
        <Separator />
      )
    case "spacer":
      const sizeMap = { sm: 2, md: 4, lg: 8, xl: 12 }
      return <div style={{ height: `${sizeMap[component.size] * 4}px` }} />
    case "image":
      return <ImageRenderer component={component} />
    case "map":
      return (
        <div className="border rounded-lg bg-muted/50 h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Map: {component.center.lat}, {component.center.lng}</p>
        </div>
      )
    default:
      return null
  }
}

// Individual component renderers
function TextRenderer({ component }: { component: TextComponent }) {
  const Tag = component.variant === "h1" ? "h1" :
              component.variant === "h2" ? "h2" :
              component.variant === "h3" ? "h3" :
              component.variant === "h4" ? "h4" :
              component.variant === "small" ? "small" : "p"
  
  const className = component.variant === "h1" ? "text-3xl font-bold" :
                    component.variant === "h2" ? "text-2xl font-semibold" :
                    component.variant === "h3" ? "text-xl font-semibold" :
                    component.variant === "h4" ? "text-lg font-medium" :
                    component.variant === "small" ? "text-sm" :
                    component.variant === "muted" ? "text-muted-foreground" : ""
  
  return <Tag className={className}>{component.content}</Tag>
}

function StatsCardRenderer({ component }: { component: StatsCardComponent }) {
  const TrendIcon = component.trend === "up" ? TrendingUp :
                    component.trend === "down" ? TrendingDown : Minus
  
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{component.title}</p>
      <p className="text-2xl font-bold mt-1">{component.value}</p>
      {component.change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-1 text-sm",
          component.trend === "up" && "text-green-500",
          component.trend === "down" && "text-red-500"
        )}>
          <TrendIcon className="h-4 w-4" />
          <span>{component.change > 0 ? "+" : ""}{component.change}%</span>
          {component.changeLabel && <span className="text-muted-foreground">{component.changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

function DataTableRenderer({ component }: { component: DataTableComponent }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {component.columns.map((col) => (
              <th key={col.key} className="px-4 py-2 text-left text-sm font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {component.data.slice(0, component.pageSize).map((row, i) => (
            <tr key={i}>
              {component.columns.map((col) => (
                <td key={col.key} className="px-4 py-2 text-sm">
                  {col.type === "badge" ? (
                    <Badge variant="outline">{String(row[col.key])}</Badge>
                  ) : (
                    String(row[col.key] ?? "")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListRenderer({ component }: { component: ListComponent }) {
  if (component.variant === "cards") {
    return (
      <div className="grid gap-2">
        {component.items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{item.title}</p>
                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              </div>
              {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <ul className="space-y-1">
      {component.items.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <span>•</span>
          <span>{item.title}</span>
          {item.badge && <Badge variant="outline" className="ml-auto">{item.badge}</Badge>}
        </li>
      ))}
    </ul>
  )
}

function ChartPlaceholder({ component }: { component: ChartComponent }) {
  return (
    <div 
      className="border rounded-lg bg-muted/30 flex items-center justify-center"
      style={{ height: component.height }}
    >
      <div className="text-center">
        <p className="text-muted-foreground">Chart: {component.chartType}</p>
        {component.title && <p className="text-sm text-muted-foreground">{component.title}</p>}
        <p className="text-xs text-muted-foreground mt-1">{component.data.length} data points</p>
      </div>
    </div>
  )
}

function ProgressRenderer({ component }: { component: ProgressComponent }) {
  return (
    <div className="space-y-1">
      {component.label && (
        <div className="flex justify-between text-sm">
          <span>{component.label}</span>
          {component.showValue && <span>{component.value}%</span>}
        </div>
      )}
      <Progress value={component.value} />
    </div>
  )
}

function FormRenderer({ 
  component, 
  onSubmit 
}: { 
  component: FormComponent
  onSubmit?: (formId: string, data: Record<string, unknown>) => void 
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {}
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }
    onSubmit?.(component.submitAction, data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {component.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
            />
          ) : field.type === "checkbox" ? (
            <div className="flex items-center gap-2">
              <Checkbox id={field.name} name={field.name} />
              <span className="text-sm">{field.placeholder}</span>
            </div>
          ) : field.type === "select" && field.options ? (
            <Select name={field.name}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}
        </div>
      ))}
      <Button type="submit">{component.submitLabel}</Button>
    </form>
  )
}

function AlertRenderer({ component }: { component: AlertComponent }) {
  const Icon = component.variant === "success" ? CheckCircle :
               component.variant === "warning" ? AlertTriangle :
               component.variant === "error" ? XCircle : Info

  return (
    <Alert variant={component.variant === "error" ? "destructive" : "default"}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{component.title}</AlertTitle>
      <AlertDescription>{component.message}</AlertDescription>
    </Alert>
  )
}

function CardRenderer({ 
  component, 
  onAction,
  onFormSubmit,
}: { 
  component: CardComponent
  onAction?: (actionId: string, data?: unknown) => void
  onFormSubmit?: (formId: string, data: Record<string, unknown>) => void
}) {
  return (
    <Card>
      {(component.title || component.description) && (
        <CardHeader>
          {component.title && <CardTitle>{component.title}</CardTitle>}
          {component.description && <CardDescription>{component.description}</CardDescription>}
        </CardHeader>
      )}
      {component.children && (
        <CardContent className="space-y-4">
          {component.children.map((child: Component) => (
            <ComponentRenderer key={child.id} component={child} onAction={onAction} onFormSubmit={onFormSubmit} />
          ))}
        </CardContent>
      )}
      {component.footer && (
        <CardFooter className="text-sm text-muted-foreground">
          {component.footer}
        </CardFooter>
      )}
    </Card>
  )
}

function TabsRenderer({ 
  component,
  onAction,
  onFormSubmit,
}: { 
  component: TabsComponent
  onAction?: (actionId: string, data?: unknown) => void
  onFormSubmit?: (formId: string, data: Record<string, unknown>) => void
}) {
  return (
    <Tabs defaultValue={component.defaultTab || component.tabs[0]?.id}>
      <TabsList>
        {component.tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>
      {component.tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="space-y-4">
          {tab.children.map((child: Component) => (
            <ComponentRenderer key={child.id} component={child} onAction={onAction} onFormSubmit={onFormSubmit} />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ImageRenderer({ component }: { component: ImageComponent }) {
  return (
    <figure>
      <img
        src={component.src}
        alt={component.alt}
        width={component.width}
        height={component.height}
        className="rounded-lg"
      />
      {component.caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-2">
          {component.caption}
        </figcaption>
      )}
    </figure>
  )
}
