// Neon Burger VR — Entry Point
import { World } from '@iwsdk/core';

const container = document.getElementById('scene-container') as HTMLDivElement;

async function main() {
  const world = await World.create(container, {
    xr: { offer: 'once' },
    render: {
      camera: { position: [0, 2.0, 1.0], lookAt: [0, 1.7, -3.5] },
      defaultLighting: false,
    },
    input: { canvasPointerEvents: true },
    features: {
      locomotion: false,
      grabbing: false,
      physics: false,
    },
  });

  const w = world as any;
  const { EnvironmentSystem } = await import('./environment-system.js');
  const { GameSystem } = await import('./game-system.js');
  const { InputSystem } = await import('./input-system.js');
  const { AudioSystem } = await import('./audio-system.js');
  const { EffectsSystem } = await import('./effects-system.js');
  const { UISystem } = await import('./ui-system.js');

  w.registerSystem(EnvironmentSystem);
  w.registerSystem(GameSystem);
  w.registerSystem(InputSystem);
  w.registerSystem(AudioSystem);
  w.registerSystem(EffectsSystem);
  w.registerSystem(UISystem);
}

main().catch(console.error);
