'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  activity: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  value: number;
}

/** Deterministic topology diagram — no fabricated synaptic activity. */
export function NeuralNetworkViz({ isTraining }: { isTraining: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const layers = [4, 8, 8, 4];
    const nodes: Node[] = [];
    const links: Link[] = [];

    layers.forEach((count, lIndex) => {
      for (let i = 0; i < count; i++) {
        const id = `l${lIndex}n${i}`;
        // Deterministic activity from index (display only — not live metrics)
        const activity = ((lIndex * 17 + i * 13) % 100) / 100;
        nodes.push({
          id,
          group: lIndex === 0 ? 0 : lIndex === layers.length - 1 ? 2 : 1,
          activity,
          x: (width / (layers.length + 1)) * (lIndex + 1),
          y: (height / (count + 1)) * (i + 1),
        });

        if (lIndex > 0) {
          const prevCount = layers[lIndex - 1];
          for (let p = 0; p < prevCount; p++) {
            const value = (((lIndex + i + p) % 20) - 10) / 10;
            links.push({
              source: `l${lIndex - 1}n${p}`,
              target: id,
              value,
            });
          }
        }
      }
    });

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => (d.value > 0 ? '#10b981' : '#ef4444'))
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', (d) => Math.abs(d.value) * 2);

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 6)
      .attr('fill', (d) =>
        d.group === 0 ? '#3b82f6' : d.group === 2 ? '#10b981' : '#6366f1'
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cx', (d) => d.x!)
      .attr('cy', (d) => d.y!);

    node.append('title').text((d) => d.id);

    link
      .attr('x1', (d) => nodes.find((n) => n.id === (d.source as string))!.x!)
      .attr('y1', (d) => nodes.find((n) => n.id === (d.source as string))!.y!)
      .attr('x2', (d) => nodes.find((n) => n.id === (d.target as string))!.x!)
      .attr('y2', (d) => nodes.find((n) => n.id === (d.target as string))!.y!);

    void isTraining;
  }, [isTraining]);

  return (
    <div
      ref={containerRef}
      className="relative h-[400px] w-full overflow-hidden rounded-3xl border border-zinc-800 bg-black/40 backdrop-blur-sm"
    >
      <div className="absolute left-4 top-4 z-10 flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Input
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Latent
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Heads
          </span>
        </div>
      </div>
      <p className="absolute bottom-4 left-4 z-10 max-w-md font-mono text-[10px] text-zinc-600">
        Topology schematic only — activity metrics require a live training job.
      </p>
      <svg ref={svgRef} className="h-full w-full" />
      {isTraining && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500">
            Training job active
          </span>
        </div>
      )}
    </div>
  );
}
