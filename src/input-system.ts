// Neon Burger VR — Input system (keyboard + XR controller via IWSDK API)
import { createSystem, InputComponent } from '@iwsdk/core';
import { GameSystem } from './game-system.js';
import { gameState } from './game-state.js';

export class InputSystem extends createSystem({}) {
  init() {
    // No manual event listeners needed — use world.input API each frame
  }

  update() {
    let dx = 0;
    let dy = 0;

    // Keyboard input (IWSDK typed API)
    const kb = this.world.input.keyboard;
    if (kb.getKeyPressed('ArrowLeft') || kb.getKeyPressed('KeyA')) dx = -1;
    else if (kb.getKeyPressed('ArrowRight') || kb.getKeyPressed('KeyD')) dx = 1;
    if (kb.getKeyPressed('ArrowUp') || kb.getKeyPressed('KeyW')) dy = 1;
    else if (kb.getKeyPressed('ArrowDown') || kb.getKeyPressed('KeyS')) dy = -1;

    if (kb.getKeyDown('Space') || kb.getKeyDown('KeyF')) {
      GameSystem.pepperPressed = true;
    }
    if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
      if (gameState.screen === 'playing') GameSystem.pausePressed = true;
      else if (gameState.screen === 'paused') gameState.screen = 'playing';
    }

    // XR controller input (IWSDK InputComponent API)
    const xrInput = this.world.input.xr;
    const right = xrInput?.gamepads?.right;
    const left = xrInput?.gamepads?.left;

    // Check both controllers for thumbstick
    for (const gp of [right, left]) {
      if (!gp) continue;
      const axes = gp.getAxesValues?.(InputComponent.Thumbstick);
      if (axes && (Math.abs(axes.x) > 0.3 || Math.abs(axes.y) > 0.3)) {
        if (Math.abs(axes.x) > Math.abs(axes.y)) {
          dx = axes.x > 0 ? 1 : -1;
        } else {
          dy = axes.y > 0 ? 1 : -1;
        }
      }
    }

    // Trigger/A = pepper, B = pause
    if (right?.getButtonDown?.(InputComponent.Trigger) ||
        right?.getButtonDown?.(InputComponent.A_Button) ||
        left?.getButtonDown?.(InputComponent.Trigger)) {
      GameSystem.pepperPressed = true;
    }
    if (right?.getButtonDown?.(InputComponent.B_Button) ||
        left?.getButtonDown?.(InputComponent.B_Button)) {
      if (gameState.screen === 'playing') GameSystem.pausePressed = true;
      else if (gameState.screen === 'paused') gameState.screen = 'playing';
    }

    GameSystem.inputDir.x = dx;
    GameSystem.inputDir.y = dy;
  }
}
