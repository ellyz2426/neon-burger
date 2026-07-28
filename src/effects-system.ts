// Neon Burger VR — Effects system (particles + visual feedback)
import {
  createSystem,
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  Color,
  Group,
} from '@iwsdk/core';
import { gameState, FIELD_X, FIELD_Y, FIELD_Z } from './game-state.js';

interface Particle {
  mesh: Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class EffectsSystem extends createSystem({}) {


  private particles: Particle[] = [];
  private ambientOrbs: Mesh[] = [];
  private orbPhases: number[] = [];
  private lastSfx = '';

  init() {
    this.world.scene = this.world.scene;
    this.createAmbientOrbs();
  }

  private createAmbientOrbs() {
    const orbGeom = new SphereGeometry(0.015, 6, 4);
    for (let i = 0; i < 20; i++) {
      const c = new Color(gameState.accentColor);
      const mat = new MeshStandardMaterial({
        color: c, emissive: c.clone().multiplyScalar(0.6),
        transparent: true, opacity: 0.5,
      });
      const orb = new Mesh(orbGeom, mat);
      orb.position.set(
        FIELD_X + (Math.random() - 0.5) * 5,
        FIELD_Y + (Math.random() - 0.5) * 3,
        FIELD_Z + (Math.random() - 0.5) * 2 - 0.5,
      );
      this.world.scene.add(orb);
      this.ambientOrbs.push(orb);
      this.orbPhases.push(Math.random() * Math.PI * 2);
    }
  }

  update(delta: number) {
    // Animate ambient orbs
    const t = performance.now() / 1000;
    for (let i = 0; i < this.ambientOrbs.length; i++) {
      const orb = this.ambientOrbs[i];
      const phase = this.orbPhases[i];
      orb.position.y += Math.sin(t * 0.5 + phase) * 0.0003;
      orb.position.x += Math.cos(t * 0.3 + phase) * 0.0002;
    }

    // Check for SFX-triggered effects
    if (gameState.sfxAction && gameState.sfxAction !== this.lastSfx) {
      this.lastSfx = gameState.sfxAction;
      if (gameState.sfxAction === 'burger_stack' || gameState.sfxAction === 'level_complete') {
        this.burstParticles(FIELD_X, FIELD_Y, FIELD_Z + 0.5, 20, 0xffcc00);
      } else if (gameState.sfxAction === 'crush') {
        this.burstParticles(FIELD_X, FIELD_Y, FIELD_Z + 0.3, 10, 0xff4444);
      } else if (gameState.sfxAction === 'achievement') {
        this.burstParticles(FIELD_X, FIELD_Y + 0.5, FIELD_Z + 0.5, 15, 0x44ffaa);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.vy -= 0.8 * delta; // gravity
      p.life -= delta;
      const frac = p.life / p.maxLife;
      (p.mesh.material as MeshStandardMaterial).opacity = frac * 0.8;
      p.mesh.scale.setScalar(frac);
      if (p.life <= 0) {
        this.world.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private burstParticles(x: number, y: number, z: number, count: number, color: number) {
    const geom = new SphereGeometry(0.02, 4, 3);
    for (let i = 0; i < count; i++) {
      const mat = new MeshStandardMaterial({
        color, emissive: new Color(color).multiplyScalar(0.5),
        transparent: true, opacity: 0.8,
      });
      const mesh = new Mesh(geom, mat);
      mesh.position.set(x, y, z);
      this.world.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 1.5 + 0.5,
        vz: (Math.random() - 0.5) * 1,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 0.8 + Math.random() * 0.5,
      });
    }
  }
}
