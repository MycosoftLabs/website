'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import type { Device } from '@/lib/devices/types';
import { statusIntent } from '@/lib/devices/metrics';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="cc-surface px-6 py-10 text-center text-sm text-white/60">Loading topology…</div>
  ),
});

type GraphNode = {
  id: string;
  name: string;
  type: string;
  status: Device['status'];
  x?: number;
  y?: number;
};

type GraphLink = { source: string; target: string };

export function NetworkTopology(props: { devices: Device[]; onSelect: (d: Device) => void }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(containerRef);

  const graph = React.useMemo(() => buildGraph(props.devices), [props.devices]);

  // Map id -> device for selection
  const index = React.useMemo(() => new Map(props.devices.map((d) => [d.id, d])), [props.devices]);

  return (
    <div className="cc-surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div>
          <div className="cc-font-orbitron text-xs uppercase tracking-[0.28em] text-white/80">Interactive Network Map</div>
          <div className="cc-font-ui mt-1 text-xs text-white/55">
            Drag nodes • Scroll to zoom • Click for device details
          </div>
        </div>
        <div className="cc-font-mono text-xs text-white/60">{graph.nodes.length} nodes • {graph.links.length} links</div>
      </div>

      <div ref={containerRef} className="relative" style={{ height: 520 }}>
        {/* @ts-expect-error - dynamic import typing */}
        <ForceGraph2D
          width={width || 960}
          height={height || 520}
          graphData={graph}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={5}
          linkColor={() => 'rgba(255,255,255,0.10)'}
          linkWidth={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1}
          linkDirectionalParticleSpeed={0.005}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            drawNode(node, ctx, globalScale);
          }}
          onNodeClick={(node: GraphNode) => {
            const d = index.get(String(node.id));
            if (d) props.onSelect(d);
          }}
          enableNodeDrag
          cooldownTicks={120}
        />

        {/* Soft vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.6)_100%)]" />
      </div>
    </div>
  );
}

function buildGraph(devices: Device[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const byId = new Map(devices.map((d) => [d.id, d]));

  const nodes: GraphNode[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    status: d.status,
    x: d.location?.x,
    y: d.location?.y,
  }));

  const links: GraphLink[] = [];
  for (const d of devices) {
    if (d.parentId && byId.has(d.parentId)) {
      links.push({ source: d.parentId, target: d.id });
    }
  }

  return { nodes, links };
}

function drawNode(node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) {
  const intent = statusIntent(node.status);
  const r = 7;

  const fill =
    intent === 'good'
      ? 'rgba(34,197,94,0.9)'
      : intent === 'warn'
        ? 'rgba(245,158,11,0.9)'
        : intent === 'bad'
          ? 'rgba(239,68,68,0.9)'
          : 'rgba(255,255,255,0.75)';

  // Glow
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.shadowColor = fill;
  ctx.shadowBlur = 18;
  ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Label
  const label = String(node.name);
  const fontSize = Math.max(10, 14 / scale);
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 2);
}

function useElementSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
