'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number; // 0: input, 1: hidden, 2: output
  activity: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  value: number;
}

export function NeuralNetworkViz({ isTraining }: { isTraining: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Generate layers
    const layers = [4, 8, 8, 4];
    const nodes: Node[] = [];
    const links: Link[] = [];

    layers.forEach((count, lIndex) => {
      for (let i = 0; i < count; i++) {
        const id = `l${lIndex}n${i}`;
        nodes.push({
          id,
          group: lIndex === 0 ? 0 : lIndex === layers.length - 1 ? 2 : 1,
          activity: Math.random(),
          x: (width / (layers.length + 1)) * (lIndex + 1),
          y: (height / (count + 1)) * (i + 1)
        });

        // Connect to previous layer
        if (lIndex > 0) {
          const prevCount = layers[lIndex - 1];
          for (let p = 0; p < prevCount; p++) {
            links.push({
              source: `l${lIndex - 1}n${p}`,
              target: id,
              value: Math.random() * 2 - 1
            });
          }
        }
      }
    });

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.value > 0 ? '#10b981' : '#ef4444')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', d => Math.abs(d.value) * 2);

    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 6)
      .attr('fill', d => d.group === 0 ? '#3b82f6' : d.group === 2 ? '#10b981' : '#6366f1')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    node.append('title').text(d => d.id);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).strength(0))
      .force('charge', d3.forceManyBody().strength(-20))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as any).x)
          .attr('y1', d => (d.source as any).y)
          .attr('x2', d => (d.target as any).x)
          .attr('y2', d => (d.target as any).y);

        node
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!);
      });

    // Animation for training
    let frame = 0;
    const animate = () => {
      frame++;
      if (isTraining && frame % 10 === 0) {
        node.attr('fill', d => {
          const act = Math.random();
          return d3.interpolateRgb(
            d.group === 0 ? '#3b82f6' : d.group === 2 ? '#10b981' : '#6366f1',
            '#fff'
          )(act * 0.5);
        });

        link.attr('stroke-opacity', d => 0.2 + Math.random() * 0.3);
      }
      requestAnimationFrame(animate);
    };

    const animReq = requestAnimationFrame(animate);

    return () => {
      simulation.stop();
      cancelAnimationFrame(animReq);
    };
  }, [isTraining]);

  return (
    <div ref={containerRef} className="w-full h-[400px] bg-black/40 rounded-3xl border border-zinc-800 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Input</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Latent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Grounding</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
      {isTraining && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Synaptic Adjustment Active</span>
        </div>
      )}
    </div>
  );
}
