/**
 * JSON-Render Catalog for AI-Generated UI
 * Defines allowed UI components that MYCA can generate via JSON
 * This provides a guard-railed approach to AI-generated interfaces
 */

import { z } from 'zod'

// Base component schema
const baseComponentSchema = z.object({
  id: z.string(),
  visible: z.boolean().optional().default(true),
})

// Text components
export const textComponentSchema = baseComponentSchema.extend({
  type: z.literal('text'),
  content: z.string(),
  variant: z.enum(['h1', 'h2', 'h3', 'h4', 'p', 'small', 'muted']).optional().default('p'),
})

export const linkComponentSchema = baseComponentSchema.extend({
  type: z.literal('link'),
  text: z.string(),
  href: z.string(),
  external: z.boolean().optional().default(false),
})

// Data display components
export const statsCardSchema = baseComponentSchema.extend({
  type: z.literal('stats-card'),
  title: z.string(),
  value: z.union([z.string(), z.number()]),
  change: z.number().optional(),
  changeLabel: z.string().optional(),
  icon: z.string().optional(),
  trend: z.enum(['up', 'down', 'neutral']).optional(),
})

export const dataTableSchema = baseComponentSchema.extend({
  type: z.literal('data-table'),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean', 'badge']).optional(),
  })),
  data: z.array(z.record(z.unknown())),
  pageSize: z.number().optional().default(10),
})

export const listSchema = baseComponentSchema.extend({
  type: z.literal('list'),
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    badge: z.string().optional(),
  })),
  variant: z.enum(['simple', 'cards', 'detailed']).optional().default('simple'),
})

// Chart components
export const chartSchema = baseComponentSchema.extend({
  type: z.literal('chart'),
  chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
  data: z.array(z.record(z.unknown())),
  xKey: z.string(),
  yKey: z.string(),
  title: z.string().optional(),
  height: z.number().optional().default(300),
})

export const progressSchema = baseComponentSchema.extend({
  type: z.literal('progress'),
  value: z.number().min(0).max(100),
  label: z.string().optional(),
  showValue: z.boolean().optional().default(true),
  variant: z.enum(['default', 'success', 'warning', 'danger']).optional(),
})

// Interactive components
export const buttonSchema = baseComponentSchema.extend({
  type: z.literal('button'),
  label: z.string(),
  action: z.string(), // Action identifier to handle in parent
  variant: z.enum(['default', 'primary', 'secondary', 'destructive', 'ghost']).optional(),
  disabled: z.boolean().optional(),
  icon: z.string().optional(),
})

export const formSchema = baseComponentSchema.extend({
  type: z.literal('form'),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'email', 'password', 'textarea', 'select', 'checkbox', 'date']),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })).optional(), // For select type
  })),
  submitLabel: z.string().optional().default('Submit'),
  submitAction: z.string(),
})

export const alertSchema = baseComponentSchema.extend({
  type: z.literal('alert'),
  title: z.string(),
  message: z.string(),
  variant: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
  dismissible: z.boolean().optional().default(false),
})

// Layout components
export const gridSchema = baseComponentSchema.extend({
  type: z.literal('grid'),
  columns: z.number().min(1).max(6).optional().default(2),
  gap: z.number().optional().default(4),
  children: z.array(z.lazy(() => componentSchema)),
})

export const cardSchema = baseComponentSchema.extend({
  type: z.literal('card'),
  title: z.string().optional(),
  description: z.string().optional(),
  children: z.array(z.lazy(() => componentSchema)).optional(),
  footer: z.string().optional(),
})

export const tabsSchema = baseComponentSchema.extend({
  type: z.literal('tabs'),
  tabs: z.array(z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    children: z.array(z.lazy(() => componentSchema)),
  })),
  defaultTab: z.string().optional(),
})

// Spacer/divider
export const dividerSchema = baseComponentSchema.extend({
  type: z.literal('divider'),
  label: z.string().optional(),
})

export const spacerSchema = baseComponentSchema.extend({
  type: z.literal('spacer'),
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional().default('md'),
})

// Image component
export const imageSchema = baseComponentSchema.extend({
  type: z.literal('image'),
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  caption: z.string().optional(),
})

// Map component
export const mapSchema = baseComponentSchema.extend({
  type: z.literal('map'),
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  zoom: z.number().optional().default(10),
  markers: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
})

// Combined component schema
export const componentSchema: z.ZodType<any> = z.discriminatedUnion('type', [
  textComponentSchema,
  linkComponentSchema,
  statsCardSchema,
  dataTableSchema,
  listSchema,
  chartSchema,
  progressSchema,
  buttonSchema,
  formSchema,
  alertSchema,
  gridSchema,
  cardSchema,
  tabsSchema,
  dividerSchema,
  spacerSchema,
  imageSchema,
  mapSchema,
])

// Widget schema (top-level container)
export const widgetSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  components: z.array(componentSchema),
  refreshInterval: z.number().optional(), // Auto-refresh in seconds
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  })).optional(),
})

// Dashboard schema (collection of widgets)
export const dashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  widgets: z.array(widgetSchema),
  layout: z.object({
    columns: z.number().optional().default(4),
    rowHeight: z.number().optional().default(150),
  }).optional(),
})

// Type exports
export type TextComponent = z.infer<typeof textComponentSchema>
export type LinkComponent = z.infer<typeof linkComponentSchema>
export type StatsCardComponent = z.infer<typeof statsCardSchema>
export type DataTableComponent = z.infer<typeof dataTableSchema>
export type ListComponent = z.infer<typeof listSchema>
export type ChartComponent = z.infer<typeof chartSchema>
export type ProgressComponent = z.infer<typeof progressSchema>
export type ButtonComponent = z.infer<typeof buttonSchema>
export type FormComponent = z.infer<typeof formSchema>
export type AlertComponent = z.infer<typeof alertSchema>
export type GridComponent = z.infer<typeof gridSchema>
export type CardComponent = z.infer<typeof cardSchema>
export type TabsComponent = z.infer<typeof tabsSchema>
export type DividerComponent = z.infer<typeof dividerSchema>
export type SpacerComponent = z.infer<typeof spacerSchema>
export type ImageComponent = z.infer<typeof imageSchema>
export type MapComponent = z.infer<typeof mapSchema>
export type Component = z.infer<typeof componentSchema>
export type Widget = z.infer<typeof widgetSchema>
export type Dashboard = z.infer<typeof dashboardSchema>

// Validation functions
export function validateComponent(data: unknown): Component | null {
  const result = componentSchema.safeParse(data)
  return result.success ? result.data : null
}

export function validateWidget(data: unknown): Widget | null {
  const result = widgetSchema.safeParse(data)
  return result.success ? result.data : null
}

export function validateDashboard(data: unknown): Dashboard | null {
  const result = dashboardSchema.safeParse(data)
  return result.success ? result.data : null
}

// System prompt for MYCA to generate valid UI JSON
export const jsonRenderSystemPrompt = `
You can generate UI widgets using structured JSON. The JSON must conform to the following component types:

AVAILABLE COMPONENTS:
1. text - Display text with variants: h1, h2, h3, h4, p, small, muted
2. link - Hyperlinks with optional external flag
3. stats-card - Metric display with title, value, and optional trend
4. data-table - Tables with columns and data arrays
5. list - Lists with items (simple, cards, or detailed variants)
6. chart - Charts (line, bar, pie, area, scatter) with data
7. progress - Progress bars with value 0-100
8. button - Buttons with action identifiers
9. form - Forms with various field types
10. alert - Alerts (info, success, warning, error)
11. grid - Layout grid with columns
12. card - Card container with title and children
13. tabs - Tabbed interface
14. divider - Visual separator
15. spacer - Vertical space (sm, md, lg, xl)
16. image - Images with src, alt, and optional caption
17. map - Map with center, zoom, and markers

EXAMPLE WIDGET:
{
  "id": "species-stats",
  "title": "Species Overview",
  "components": [
    {
      "id": "total-count",
      "type": "stats-card",
      "title": "Total Species",
      "value": 12450,
      "trend": "up",
      "change": 5.2
    },
    {
      "id": "species-chart",
      "type": "chart",
      "chartType": "bar",
      "data": [...],
      "xKey": "genus",
      "yKey": "count"
    }
  ]
}

Always generate valid JSON that matches these schemas. Each component must have a unique "id" and a "type" field.
`
