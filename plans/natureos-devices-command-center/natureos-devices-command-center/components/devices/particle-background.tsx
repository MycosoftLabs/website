'use client';

import * as React from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

export function ParticleBackground() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const options: ISourceOptions = React.useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      detectRetina: true,
      background: { color: { value: 'transparent' } },
      particles: {
        number: { value: 62, density: { enable: true, width: 1200, height: 800 } },
        color: { value: ['#ffffff', '#06b6d4', '#8b5cf6'] },
        links: {
          enable: true,
          color: '#ffffff',
          distance: 150,
          opacity: 0.12,
          width: 1,
        },
        opacity: { value: { min: 0.18, max: 0.55 } },
        size: { value: { min: 1, max: 2 } },
        move: {
          enable: true,
          speed: 0.65,
          direction: 'none',
          outModes: { default: 'out' },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
          onClick: { enable: true, mode: 'push' },
          resize: true,
        },
        modes: {
          grab: { distance: 180, links: { opacity: 0.2 } },
          push: { quantity: 2 },
        },
      },
    }),
    []
  );

  if (!ready) return null;

  return (
    <Particles
      id="cc-particles"
      className="h-full w-full"
      options={options}
    />
  );
}
