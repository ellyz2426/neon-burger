// Neon Burger VR — Environment system (holodeck aesthetic)
import {
  createSystem,
  World,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  Color,
  FogExp2,
  AmbientLight,
  PointLight,
  Group,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from '@iwsdk/core';
import { gameState, FIELD_Z } from './game-state.js';

export class EnvironmentSystem extends createSystem({}) {


  private stars: Mesh[] = [];
  private initialized = false;

  init() {
    this.world.scene = this.world.scene;
    this.buildEnvironment();
    this.initialized = true;
  }

  private buildEnvironment() {
    const accent = new Color(gameState.accentColor);

    // Scene fog
    this.world.scene.fog = new FogExp2(0x000011, 0.08);
    this.world.scene.background = new Color(0x000008);

    // Ambient light
    const ambient = new AmbientLight(0x334466, 0.4);
    this.world.scene.add(ambient);

    // Point lights
    const light1 = new PointLight(gameState.accentColor, 1.5, 12);
    light1.position.set(0, 3.5, -2);
    this.world.scene.add(light1);
    const light2 = new PointLight(0x4466ff, 0.8, 10);
    light2.position.set(-2, 2, -4);
    this.world.scene.add(light2);
    const light3 = new PointLight(0x4466ff, 0.8, 10);
    light3.position.set(2, 2, -4);
    this.world.scene.add(light3);

    // Grid floor
    const floorGeom = new BoxGeometry(12, 0.01, 12);
    const floorMat = new MeshStandardMaterial({
      color: 0x050510, emissive: accent.clone().multiplyScalar(0.03),
      metalness: 0.9, roughness: 0.1,
    });
    const floor = new Mesh(floorGeom, floorMat);
    floor.position.set(0, 0, -3);
    this.world.scene.add(floor);

    // Floor glow
    const glowGeom = new CylinderGeometry(2.5, 2.5, 0.005, 32);
    const glowMat = new MeshStandardMaterial({
      color: gameState.accentColor, emissive: accent.clone().multiplyScalar(0.15),
      transparent: true, opacity: 0.2,
    });
    const glow = new Mesh(glowGeom, glowMat);
    glow.position.set(0, 0.01, FIELD_Z);
    this.world.scene.add(glow);

    // Floor grid lines
    const lineMatFloor = new LineBasicMaterial({ color: gameState.accentColor, transparent: true, opacity: 0.1 });
    for (let i = -6; i <= 6; i++) {
      const geomH = new BoxGeometry(12, 0.001, 0.002);
      const lineH = new Mesh(geomH, new MeshStandardMaterial({
        color: gameState.accentColor, emissive: accent.clone().multiplyScalar(0.08),
        transparent: true, opacity: 0.15,
      }));
      lineH.position.set(0, 0.005, -3 + i);
      this.world.scene.add(lineH);
      const geomV = new BoxGeometry(0.002, 0.001, 12);
      const lineV = new Mesh(geomV, new MeshStandardMaterial({
        color: gameState.accentColor, emissive: accent.clone().multiplyScalar(0.08),
        transparent: true, opacity: 0.15,
      }));
      lineV.position.set(i, 0.005, -3);
      this.world.scene.add(lineV);
    }

    // Wireframe pillars
    const pillarPositions = [
      [-3, 0, -6], [3, 0, -6], [-3, 0, -1], [3, 0, -1],
      [-5, 0, -4], [5, 0, -4],
    ];
    for (const pp of pillarPositions) {
      const pGeom = new BoxGeometry(0.15, 3.5, 0.15);
      const pMat = new MeshStandardMaterial({
        color: 0x111133, emissive: accent.clone().multiplyScalar(0.08),
        metalness: 0.9, roughness: 0.3,
      });
      const pillar = new Mesh(pGeom, pMat);
      pillar.position.set(pp[0], 1.75, pp[2]);
      this.world.scene.add(pillar);

      // Wireframe edges
      const edges = new EdgesGeometry(pGeom);
      const edgeMat = new LineBasicMaterial({ color: gameState.accentColor, transparent: true, opacity: 0.3 });
      const wire = new LineSegments(edges, edgeMat);
      pillar.add(wire);

      // Cap glow
      const capGeom = new BoxGeometry(0.2, 0.02, 0.2);
      const capMat = new MeshStandardMaterial({
        color: gameState.accentColor, emissive: accent.clone().multiplyScalar(0.4),
        transparent: true, opacity: 0.6,
      });
      const cap = new Mesh(capGeom, capMat);
      cap.position.set(pp[0], 3.5, pp[2]);
      this.world.scene.add(cap);
    }

    // Ceiling light strips
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 2;
      const stripGeom = new BoxGeometry(0.05, 0.02, 6);
      const stripMat = new MeshStandardMaterial({
        color: gameState.accentColor, emissive: accent.clone().multiplyScalar(0.5),
        transparent: true, opacity: 0.4,
      });
      const strip = new Mesh(stripGeom, stripMat);
      strip.position.set(x, 3.5, -3);
      this.world.scene.add(strip);
    }

    // Stars
    const starGeom = new SphereGeometry(0.008, 4, 3);
    for (let i = 0; i < 60; i++) {
      const starMat = new MeshStandardMaterial({
        color: 0xffffff, emissive: new Color(0xffffff).multiplyScalar(0.5),
        transparent: true, opacity: 0.3 + Math.random() * 0.5,
      });
      const star = new Mesh(starGeom, starMat);
      star.position.set(
        (Math.random() - 0.5) * 12,
        3.2 + Math.random() * 0.5,
        -2 + (Math.random() - 0.5) * 8,
      );
      this.world.scene.add(star);
      this.stars.push(star);
    }
  }

  update(delta: number) {
    if (!this.initialized) return;
    // Twinkle stars
    const t = performance.now() / 1000;
    for (let i = 0; i < this.stars.length; i++) {
      const mat = this.stars[i].material as MeshStandardMaterial;
      mat.opacity = 0.3 + Math.sin(t * 2 + i * 1.7) * 0.3;
    }
  }
}
