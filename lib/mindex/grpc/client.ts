import path from "node:path"

export interface MindexGrpcClientOptions {
  address: string // e.g. localhost:9000
  insecure?: boolean
}

/**
 * Create a gRPC client for the MINDEX v2 telemetry service.
 *
 * Notes:
 * - This is server-side only (Node runtime).
 * - It requires `@grpc/grpc-js` + `@grpc/proto-loader` installed.
 */
export async function createMindexGrpcClient(options: MindexGrpcClientOptions) {
  const grpc = await import("@grpc/grpc-js")
  const protoLoader = await import("@grpc/proto-loader")

  const protoPath = path.join(process.cwd(), "lib", "mindex", "grpc", "mindex.proto")
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

  const loaded = grpc.loadPackageDefinition(packageDefinition) as any
  const ServiceCtor = loaded?.mindex?.v2?.MindexTelemetry
  if (!ServiceCtor) throw new Error("Failed to load MindexTelemetry service from proto")

  const creds = options.insecure ? grpc.credentials.createInsecure() : grpc.credentials.createInsecure()
  return new ServiceCtor(options.address, creds)
}

