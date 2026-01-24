import { getMindexHealth, getTaxonById, listTaxa, searchObservations, searchTaxa } from "@/lib/integrations/mindex"

export interface GraphQLContext {
  requestId: string
}

export function createGraphQLContext(): GraphQLContext {
  return { requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

export const resolvers = {
  Query: {
    async health() {
      return await getMindexHealth()
    },
    async taxon(_parent: unknown, args: { id: string }) {
      return await getTaxonById(args.id)
    },
    async taxa(_parent: unknown, args: { q?: string; page?: number; page_size?: number }) {
      const page = args.page ?? 1
      const pageSize = args.page_size ?? 20
      const result = args.q
        ? await searchTaxa({ query: args.q, page, pageSize })
        : await listTaxa({ page, pageSize })
      return result
    },
    async observations(_parent: unknown, args: { q?: string; page?: number; page_size?: number }) {
      const page = args.page ?? 1
      const pageSize = args.page_size ?? 20
      const result = await searchObservations({ query: args.q || "", page, pageSize })
      return result
    },
  },
}

