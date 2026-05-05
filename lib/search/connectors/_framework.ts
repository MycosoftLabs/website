/**
 * Universal search connector framework — MINDEX-first + optional write-back (May 03 2026)
 *
 * Used by `/api/search/stream` and domain modules. Each connector declares sources
 * (fetch + transform) and an optional ingest hook (MINDEX or transitional cache).
 */

export interface ConnectorRunContext {
  query: string
  signal: AbortSignal
  limit: number
  origin: string
}

export interface ConnectorSource<T = unknown> {
  name: string
  fetch: (ctx: ConnectorRunContext) => Promise<T>
  transform: (raw: T, ctx: ConnectorRunContext) => unknown[]
}

export interface MindexIngestSpec {
  /** Relative path under MINDEX API, e.g. `search/earth/ingest` */
  path: string
  dedupKey?: string
  ttlSeconds?: number
}

export interface DefineConnectorArgs<TWidget extends string> {
  widgetType: TWidget
  sources: ConnectorSource[]
  /** Optional POST body builder for MINDEX ingest; skipped when items empty */
  ingest?: (items: unknown[], ctx: ConnectorRunContext & { source: string }) => Promise<void>
  mindexIngest?: MindexIngestSpec
}

export interface ConnectorRunChunk {
  widgetType: string
  source: string
  items: unknown[]
}

export function defineConnector<TWidget extends string>(args: DefineConnectorArgs<TWidget>) {
  return {
    widgetType: args.widgetType,
    async run(ctx: ConnectorRunContext): Promise<ConnectorRunChunk[]> {
      const chunks: ConnectorRunChunk[] = []
      for (const src of args.sources) {
        const raw = await src.fetch(ctx)
        const items = src.transform(raw, ctx)
        chunks.push({ widgetType: args.widgetType, source: src.name, items })
        if (args.ingest && items.length > 0) {
          await args.ingest(items, { ...ctx, source: src.name }).catch(() => undefined)
        }
      }
      return chunks
    },
  }
}

export type DefinedConnector<TWidget extends string = string> = ReturnType<typeof defineConnector<TWidget>>
