export function labWebRoot(): string
export function labCatalogRoot(): string
export function staticDocuments(): Array<Record<string, unknown>>
export function staticLabBootstrap(): Record<string, unknown>
export function staticWorkspace(): Record<string, unknown>
export function staticWorkspacePage(id: string, page?: number): Record<string, unknown> | null
export function staticFormspace(): Record<string, unknown>
export function staticFormAtlas(): Record<string, unknown>
export function staticEmptyList(): unknown[]
export function readLabStatic(urlPath: string): {bytes: Buffer; type: string} | null
export function staticComputeDenied(): Record<string, unknown>
