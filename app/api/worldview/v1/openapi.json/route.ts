import { NextResponse } from "next/server"
import { DATASETS } from "@/lib/worldview/registry"
import { BUNDLES } from "@/lib/worldview/bundles"

/**
 * Worldview v1 — OpenAPI 3.1 spec, auto-generated from the registry.
 *
 * GET /api/worldview/v1/openapi.json
 *
 * LangChain / LlamaIndex / OpenAI function-calling can consume this
 * spec directly to get first-class tool access to every Worldview
 * dataset without hand-writing bindings.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const spec: any = {
    openapi: "3.1.0",
    info: {
      title: "Mycosoft Worldview API",
      version: "1.0.0",
      description: "Unified gateway to CREP + MINDEX + NatureOS datasets. Agent-first, token-metered, rate-limited.",
      contact: { name: "Mycosoft Labs", url: "https://mycosoft.com" },
      termsOfService: "https://mycosoft.com/terms",
      license: { name: "Commercial" },
    },
    servers: [{ url: "https://mycosoft.com" }],
    externalDocs: {
      description: "Full plan + design rationale",
      url: "https://github.com/MycosoftLabs/website/blob/main/docs/WORLDVIEW_API_V2_PLAN.md",
    },
    components: {
      securitySchemes: {
        BearerKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "mk_<64-hex>",
          description: "Buy an API key at https://mycosoft.com/agent ($1 connection + metered per-request cost)",
        },
      },
      schemas: {
        WorldviewEnvelope: {
          type: "object",
          required: ["ok", "request_id"],
          properties: {
            ok: { type: "boolean" },
            request_id: { type: "string" },
            dataset: { type: "string", nullable: true },
            bundle: { type: "string", nullable: true },
            cost_debited: { type: "integer", description: "Cents debited from balance_cents" },
            balance_remaining: { type: "integer", nullable: true },
            rate_limit: {
              type: "object",
              properties: {
                limit_per_minute: { type: "integer" },
                remaining_per_minute: { type: "integer" },
                reset_at: { type: "string", format: "date-time" },
              },
            },
            cache: { type: "string", enum: ["hit", "miss", "stale", "bypass"] },
            generated_at: { type: "string", format: "date-time" },
            ttl_s: { type: "integer" },
            data: { description: "Dataset-specific payload (see x-response-shape on each path)" },
            meta: { type: "object" },
          },
        },
      },
    },
    security: [{ BearerKey: [] }],
    paths: {
      "/api/worldview/v1/health": {
        get: {
          summary: "Liveness + upstream reachability",
          security: [],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/worldview/v1/catalog": {
        get: {
          summary: "List every dataset + cost + scope",
          security: [],
          parameters: [
            { name: "scope", in: "query", schema: { type: "string", enum: ["public", "agent", "fusarium", "ops"] } },
            { name: "category", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/worldview/v1/bundles": {
        get: { summary: "List every bundle", security: [], responses: { "200": { description: "OK" } } },
      },
      "/api/worldview/v1/snapshot": {
        get: {
          summary: "Aggregated world-state snapshot",
          parameters: [{ name: "project", in: "query", schema: { type: "string", enum: ["global", "oyster", "goffs"] } }],
          "x-cost-cents": 2,
          responses: { "200": { description: "Envelope", content: { "application/json": { schema: { $ref: "#/components/schemas/WorldviewEnvelope" } } } } },
        },
      },
      "/api/worldview/v1/usage": {
        get: { summary: "Caller balance + rate-limit state", responses: { "200": { description: "OK" } } },
      },
      "/api/worldview/v1/query": {
        get: {
          summary: "Unified dataset query",
          description: "Pass `type=<dataset_id>` from /catalog plus any dataset-specific params.",
          parameters: [
            { name: "type", in: "query", required: true, schema: { type: "string" } },
            { name: "bbox", in: "query", schema: { type: "string", example: "-118,32,-116,34" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Envelope", content: { "application/json": { schema: { $ref: "#/components/schemas/WorldviewEnvelope" } } } } },
        },
      },
      "/api/worldview/v1/bundle/{bundle_id}": {
        get: {
          summary: "Fetch a pre-composed bundle",
          parameters: [
            { name: "bundle_id", in: "path", required: true, schema: { type: "string" } },
            { name: "bbox", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Envelope" } },
        },
      },
    },
    "x-worldview": {
      datasets: DATASETS.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        scope: d.scope,
        cost_cents: d.cost_per_request,
        rate_weight: d.rate_weight,
        cache_ttl_s: Math.floor(d.cache_ttl_ms / 1000),
        supports: d.supports,
        response_shape: d.response_shape,
        example: d.example,
      })),
      bundles: BUNDLES.map((b) => ({
        id: b.id,
        name: b.name,
        datasets: b.datasets,
        scope: b.scope,
        cost_cents: b.cost_per_request,
        rate_weight: b.rate_weight,
      })),
    },
  }

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*", // spec is meant to be consumed by 3rd-party agents
    },
  })
}
