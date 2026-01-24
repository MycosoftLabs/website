import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { createGraphQLContext, resolvers } from "@/lib/mindex/graphql/resolvers"
import { mindexSchemaSDL } from "@/lib/mindex/graphql/schema"

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  graphql,
  GraphQLScalarType,
  Kind,
} from "graphql"

export const dynamic = "force-dynamic"

// Minimal JSON scalar
const GraphQLJSON = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize(value) {
    return value
  },
  parseValue(value) {
    return value
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return ast.value
    if (ast.kind === Kind.INT) return Number(ast.value)
    if (ast.kind === Kind.FLOAT) return Number(ast.value)
    if (ast.kind === Kind.BOOLEAN) return ast.value
    return null
  },
})

const TaxonType = new GraphQLObjectType({
  name: "Taxon",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    canonical_name: { type: new GraphQLNonNull(GraphQLString) },
    common_name: { type: GraphQLString },
    rank: { type: new GraphQLNonNull(GraphQLString) },
    source: { type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
  },
})

const ObservationLocationType = new GraphQLObjectType({
  name: "ObservationLocation",
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    coordinates: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLFloat))) },
  },
})

const ObservationType = new GraphQLObjectType({
  name: "Observation",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    taxon_id: { type: GraphQLID },
    observed_at: { type: GraphQLString },
    source: { type: GraphQLString },
    location: { type: ObservationLocationType },
  },
})

const TaxaResponseType = new GraphQLObjectType({
  name: "TaxaResponse",
  fields: {
    data: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TaxonType))) },
    meta: { type: GraphQLJSON },
  },
})

const ObservationsResponseType = new GraphQLObjectType({
  name: "ObservationsResponse",
  fields: {
    data: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ObservationType))) },
    meta: { type: GraphQLJSON },
  },
})

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    health: {
      type: new GraphQLNonNull(GraphQLJSON),
      resolve: () => resolvers.Query.health(),
    },
    taxon: {
      type: TaxonType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_parent, args) => resolvers.Query.taxon(_parent, { id: String(args.id) }),
    },
    taxa: {
      type: new GraphQLNonNull(TaxaResponseType),
      args: {
        q: { type: GraphQLString },
        page: { type: GraphQLInt },
        page_size: { type: GraphQLInt },
      },
      resolve: (_parent, args) =>
        resolvers.Query.taxa(_parent, {
          q: args.q || undefined,
          page: args.page ?? undefined,
          page_size: args.page_size ?? undefined,
        }),
    },
    observations: {
      type: new GraphQLNonNull(ObservationsResponseType),
      args: {
        q: { type: GraphQLString },
        page: { type: GraphQLInt },
        page_size: { type: GraphQLInt },
      },
      resolve: (_parent, args) =>
        resolvers.Query.observations(_parent, {
          q: args.q || undefined,
          page: args.page ?? undefined,
          page_size: args.page_size ?? undefined,
        }),
    },
  },
})

const schema = new GraphQLSchema({
  query: QueryType,
  types: [TaxonType, ObservationType, TaxaResponseType, ObservationsResponseType, GraphQLJSON],
})

export async function POST(request: Request) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  let body: { query?: string; variables?: Record<string, unknown> }
  try {
    body = (await request.json()) as { query?: string; variables?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  if (!body.query) {
    return NextResponse.json({ error: "Missing GraphQL query", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const result = await graphql({
    schema,
    source: body.query,
    variableValues: body.variables,
    contextValue: createGraphQLContext(),
  })

  return NextResponse.json(result, { status: result.errors?.length ? 400 : 200 })
}

// Optional: expose schema SDL (useful for tooling)
export async function GET() {
  return NextResponse.json({ sdl: mindexSchemaSDL })
}

