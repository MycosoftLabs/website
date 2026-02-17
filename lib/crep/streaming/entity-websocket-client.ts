import {
  decodeEntityBatchFromBinary,
  decodeEntityFromBinary,
} from "@/lib/crep/proto/entity-codec";
import { getViewportCells, MapBounds } from "@/lib/crep/spatial/s2-indexer";
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema";

export interface EntityStreamConnectOptions {
  types?: string[];
  timeFrom?: string;
}

export class EntityStreamClient {
  private ws: WebSocket | null = null;
  private cells = new Set<string>();
  private readonly endpointBase: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onEntityHandler: ((entity: UnifiedEntity) => void) | null = null;
  private options: EntityStreamConnectOptions = {};

  constructor(endpointBase?: string) {
    this.endpointBase =
      endpointBase ||
      process.env.NEXT_PUBLIC_MAS_WS_URL ||
      "ws://192.168.0.188:8001";
  }

  connect(onEntity: (entity: UnifiedEntity) => void, options: EntityStreamConnectOptions = {}): void {
    this.onEntityHandler = onEntity;
    this.options = options;
    this.openSocket();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  updateViewport(bounds: MapBounds, zoom: number): void {
    const nextCells = new Set(getViewportCells(bounds, zoom));
    if (this.setsEqual(this.cells, nextCells)) return;
    this.cells = nextCells;
    this.reconnect();
  }

  private openSocket(): void {
    if (!this.onEntityHandler) return;

    const url = new URL(`${this.endpointBase.replace(/^http/, "ws")}/api/entities/stream`);
    if (this.cells.size > 0) {
      url.searchParams.set("cells", [...this.cells].join(","));
    }
    if (this.options.types?.length) {
      url.searchParams.set("types", this.options.types.join(","));
    }
    if (this.options.timeFrom) {
      url.searchParams.set("time_from", this.options.timeFrom);
    }

    this.ws = new WebSocket(url.toString());
    this.ws.binaryType = "arraybuffer";

    this.ws.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      if (!this.onEntityHandler) return;
      try {
        if (typeof event.data === "string") {
          const parsed = JSON.parse(event.data) as UnifiedEntity;
          this.onEntityHandler(parsed);
          return;
        }

        const batch = decodeEntityBatchFromBinary(event.data);
        for (const entity of batch.entities) {
          this.onEntityHandler(entity);
        }
      } catch {
        try {
          if (typeof event.data !== "string") {
            const entity = decodeEntityFromBinary(event.data);
            this.onEntityHandler(entity);
          }
        } catch {
          // No-op: malformed payload from upstream source.
        }
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.openSocket(), 1500);
    };
  }

  private reconnect(): void {
    if (!this.onEntityHandler) return;
    this.disconnect();
    this.openSocket();
  }

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }
}
