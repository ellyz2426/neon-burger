// Neon Burger VR — Core game system (BurgerTime mechanics)
import {
  createSystem,
  World,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  Group,
  Color,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from '@iwsdk/core';
import {
  gameState,
  getLevel,
  gridToWorld,
  ingredientColor,
  enemyColor,
  GRID_COLS,
  GRID_ROWS,
  CELL_W,
  CELL_H,
  FIELD_Z,
  IngredientState,
  EnemyState,
  LevelData,
} from './game-state.js';

// Helpers
function hasPlatformAt(level: LevelData, col: number, row: number): boolean {
  return level.platforms.some(p => p.row === row && col >= p.startCol && col <= p.endCol);
}
function canLadderUp(level: LevelData, col: number, row: number): boolean {
  return level.ladders.some(l => l.col === col && row >= l.startRow && row < l.endRow);
}
function canLadderDown(level: LevelData, col: number, row: number): boolean {
  return level.ladders.some(l => l.col === col && row > l.startRow && row <= l.endRow);
}
function hasLadderAt(level: LevelData, col: number, row: number): boolean {
  return level.ladders.some(l => l.col === col && row >= l.startRow && row <= l.endRow);
}

export class GameSystem extends createSystem({}) {


  private fieldGroup!: Group;
  private playerMesh!: Group;
  private platformMeshes: Mesh[] = [];
  private ladderGroups: Group[] = [];
  private plateMeshes: Mesh[] = [];
  private pepperCloud: Mesh | null = null;
  private pepperTimer = 0;
  private currentLevel!: LevelData;
  private burgersNeeded = 0;
  private burgersCompleted = 0;
  private playerTargetX = 0;
  private playerTargetY = 0;
  private moveCooldown = 0;
  private levelAdvanceTimer = -1;
  private initialized = false;

  // Static input state (written by InputSystem)
  static inputDir = { x: 0, y: 0 };
  static pepperPressed = false;
  static pausePressed = false;

  init() {
    this.world.scene = this.world.scene;
    this.fieldGroup = new Group();
    this.world.scene.add(this.fieldGroup);
    gameState.loadStats();
    this.initialized = true;
  }

  update(delta: number) {
    if (!this.initialized) return;

    if (gameState.screen === 'playing') {
      this.updateGameplay(delta);
    } else if (gameState.screen === 'newgame') {
      this.startNewGame();
    } else if (gameState.screen === 'nextlevel') {
      gameState.level++;
      this.setupLevel();
      gameState.screen = 'playing';
    }

    if (this.levelAdvanceTimer > 0) {
      this.levelAdvanceTimer -= delta;
      if (this.levelAdvanceTimer <= 0 && gameState.screen === 'playing') {
        gameState.screen = 'nextlevel';
      }
    }
  }

  private startNewGame() {
    gameState.score = 0;
    gameState.lives = gameState.mode === 'zen' ? 99 : 3;
    gameState.peppers = gameState.mode === 'challenge' ? 3 : 5;
    gameState.level = 1;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.speedTimer = 120;
    gameState.totalGames++;
    gameState.saveStats();
    this.setupLevel();
    gameState.screen = 'playing';
  }

  private setupLevel() {
    this.clearField();
    this.currentLevel = getLevel(gameState.level);
    const diffMult = gameState.difficulty === 'hard' ? 1.3 : gameState.difficulty === 'insane' ? 1.7 : 1.0;
    this.buildPlatforms();
    this.buildLadders();
    this.buildPlates();
    this.buildIngredients();
    this.buildPlayer();
    this.buildEnemies(diffMult);
    gameState.playerCol = this.currentLevel.playerStart.col;
    gameState.playerRow = this.currentLevel.playerStart.row;
    gameState.playerOnLadder = false;
    const [px, py, pz] = gridToWorld(gameState.playerCol, gameState.playerRow);
    this.playerTargetX = px;
    this.playerTargetY = py;
    this.playerMesh.position.set(px, py, pz + 0.05);
    const burgerIdxSet = new Set(this.currentLevel.ingredients.map(i => i.burgerIdx));
    this.burgersNeeded = burgerIdxSet.size;
    this.burgersCompleted = 0;
    gameState.levelComplete = false;
    gameState.levelDeaths = 0;
    gameState.levelPeppersUsed = 0;
    gameState.levelStartTime = performance.now() / 1000;
    this.levelAdvanceTimer = -1;
  }

  private clearField() {
    while (this.fieldGroup.children.length > 0) {
      this.fieldGroup.remove(this.fieldGroup.children[0]);
    }
    this.platformMeshes = [];
    this.ladderGroups = [];
    this.plateMeshes = [];
    gameState.ingredients = [];
    gameState.enemies = [];
    this.pepperCloud = null;
  }

  private buildPlatforms() {
    const accent = new Color(gameState.accentColor);
    for (const p of this.currentLevel.platforms) {
      const w = (p.endCol - p.startCol + 1) * CELL_W;
      const geom = new BoxGeometry(w, 0.02, CELL_W * 0.6);
      const mat = new MeshStandardMaterial({
        color: 0x111122, emissive: accent.clone().multiplyScalar(0.15),
        metalness: 0.8, roughness: 0.3,
      });
      const mesh = new Mesh(geom, mat);
      const cx = (p.startCol + p.endCol) / 2;
      const [x, y, z] = gridToWorld(cx, p.row);
      mesh.position.set(x, y - CELL_H * 0.35, z);
      const edges = new EdgesGeometry(geom);
      const lineMat = new LineBasicMaterial({ color: gameState.accentColor, transparent: true, opacity: 0.5 });
      mesh.add(new LineSegments(edges, lineMat));
      this.fieldGroup.add(mesh);
      this.platformMeshes.push(mesh);
    }
  }

  private buildLadders() {
    const accent = new Color(gameState.accentColor);
    for (const l of this.currentLevel.ladders) {
      const group = new Group();
      const [lx, , lz] = gridToWorld(l.col, 0);
      for (let r = l.startRow; r <= l.endRow; r++) {
        const [, ry] = gridToWorld(0, r);
        const rungGeom = new BoxGeometry(CELL_W * 0.5, 0.015, 0.01);
        const rungMat = new MeshStandardMaterial({ color: 0x222244, emissive: accent.clone().multiplyScalar(0.3) });
        const rung = new Mesh(rungGeom, rungMat);
        rung.position.set(lx, ry - CELL_H * 0.15, lz + 0.02);
        group.add(rung);
      }
      const totalH = (l.endRow - l.startRow) * CELL_H;
      const midY = gridToWorld(0, (l.startRow + l.endRow) / 2)[1] - CELL_H * 0.15;
      const railGeom = new BoxGeometry(0.008, totalH, 0.008);
      const railMat = new MeshStandardMaterial({ color: 0x222244, emissive: accent.clone().multiplyScalar(0.25) });
      const leftRail = new Mesh(railGeom, railMat);
      leftRail.position.set(lx - CELL_W * 0.22, midY, lz + 0.02);
      group.add(leftRail);
      const rightRail = new Mesh(railGeom, railMat);
      rightRail.position.set(lx + CELL_W * 0.22, midY, lz + 0.02);
      group.add(rightRail);
      this.fieldGroup.add(group);
      this.ladderGroups.push(group);
    }
  }

  private buildPlates() {
    for (const pl of this.currentLevel.plates) {
      const w = pl.width * CELL_W;
      const geom = new BoxGeometry(w, 0.03, CELL_W * 0.7);
      const mat = new MeshStandardMaterial({
        color: 0x333355, emissive: new Color(gameState.accentColor).multiplyScalar(0.2),
        metalness: 0.9, roughness: 0.2,
      });
      const mesh = new Mesh(geom, mat);
      const cx = pl.col + (pl.width - 1) / 2;
      const [x, y, z] = gridToWorld(cx, 0);
      mesh.position.set(x, y - CELL_H * 0.45, z);
      this.fieldGroup.add(mesh);
      this.plateMeshes.push(mesh);
    }
  }

  private buildIngredients() {
    for (const def of this.currentLevel.ingredients) {
      const color = ingredientColor(def.type);
      const sectionMeshes: Mesh[] = [];
      for (let s = 0; s < def.width; s++) {
        const geom = new BoxGeometry(CELL_W * 0.85, 0.04, CELL_W * 0.4);
        const mat = new MeshStandardMaterial({
          color, emissive: new Color(color).multiplyScalar(0.3),
          metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.85,
        });
        const mesh = new Mesh(geom, mat);
        const [sx, sy, sz] = gridToWorld(def.col + s, def.row);
        mesh.position.set(sx, sy - CELL_H * 0.25, sz + 0.03);
        sectionMeshes.push(mesh);
        this.fieldGroup.add(mesh);
      }
      const state: IngredientState = {
        def, currentRow: def.row,
        sectionsWalked: new Array(def.width).fill(false),
        dropping: false, dropProgress: 0, dropStartRow: def.row, dropTarget: def.row,
        complete: false, sectionMeshes,
      };
      gameState.ingredients.push(state);
    }
  }

  private buildPlayer() {
    const group = new Group();
    const bodyGeom = new BoxGeometry(CELL_W * 0.35, CELL_H * 0.35, CELL_W * 0.25);
    const bodyMat = new MeshStandardMaterial({
      color: 0x00ddff, emissive: new Color(0x00ddff).multiplyScalar(0.5),
      metalness: 0.3, roughness: 0.4,
    });
    group.add(new Mesh(bodyGeom, bodyMat));
    const hatGeom = new CylinderGeometry(CELL_W * 0.12, CELL_W * 0.15, CELL_H * 0.15, 8);
    const hatMat = new MeshStandardMaterial({
      color: 0xffffff, emissive: new Color(0xffffff).multiplyScalar(0.3),
    });
    const hat = new Mesh(hatGeom, hatMat);
    hat.position.y = CELL_H * 0.22;
    group.add(hat);
    this.playerMesh = group;
    this.fieldGroup.add(group);
  }

  private buildEnemies(diffMult: number) {
    for (const def of this.currentLevel.enemies) {
      const color = enemyColor(def.type);
      const group = new Group();
      const bodyGeom = new SphereGeometry(CELL_W * 0.2, 8, 6);
      const bodyMat = new MeshStandardMaterial({
        color, emissive: new Color(color).multiplyScalar(0.4),
        metalness: 0.3, roughness: 0.5,
      });
      group.add(new Mesh(bodyGeom, bodyMat));
      const eyeGeom = new SphereGeometry(CELL_W * 0.04, 6, 4);
      const eyeMat = new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0xffffff).multiplyScalar(0.5) });
      const le = new Mesh(eyeGeom, eyeMat);
      le.position.set(-CELL_W * 0.08, CELL_W * 0.06, CELL_W * 0.15);
      group.add(le);
      const re = new Mesh(eyeGeom, eyeMat);
      re.position.set(CELL_W * 0.08, CELL_W * 0.06, CELL_W * 0.15);
      group.add(re);
      const [ex, ey, ez] = gridToWorld(def.col, def.row);
      group.position.set(ex, ey, ez + 0.05);
      this.fieldGroup.add(group);
      const baseSpeed = def.type === 'hotdog' ? 1.2 : def.type === 'pickle' ? 1.5 : 1.0;
      const levelSpeed = 1 + (gameState.level - 1) * 0.08;
      gameState.enemies.push({
        type: def.type, gridCol: def.col, gridRow: def.row,
        mesh: group, speed: baseSpeed * levelSpeed * diffMult,
        stunned: false, stunTimer: 0, dead: false, respawnTimer: 0,
        moveTimer: 0, onLadder: false,
      });
    }
  }

  // --- Gameplay update ---
  private updateGameplay(delta: number) {
    if (this.moveCooldown > 0) this.moveCooldown -= delta;
    if (gameState.mode === 'speed') {
      gameState.speedTimer -= delta;
      if (gameState.speedTimer <= 0) { this.endGame(); return; }
    }
    if (gameState.comboTimer > 0) {
      gameState.comboTimer -= delta;
      if (gameState.comboTimer <= 0) gameState.combo = 0;
    }
    if (this.pepperTimer > 0) {
      this.pepperTimer -= delta;
      if (this.pepperTimer <= 0 && this.pepperCloud) {
        this.fieldGroup.remove(this.pepperCloud);
        this.pepperCloud = null;
      }
    }
    this.handlePlayerMovement();
    this.updateIngredients(delta);
    this.updateEnemies(delta);
    this.checkPlayerEnemyCollision();
    this.updatePlayerMeshPosition(delta);
    if (GameSystem.pepperPressed) { GameSystem.pepperPressed = false; this.usePepper(); }
    if (GameSystem.pausePressed) { GameSystem.pausePressed = false; gameState.screen = 'paused'; }
    gameState.levelTime = performance.now() / 1000 - gameState.levelStartTime;
  }

  private handlePlayerMovement() {
    if (this.moveCooldown > 0) return;
    const dir = GameSystem.inputDir;
    if (dir.x === 0 && dir.y === 0) return;
    let nc = gameState.playerCol;
    let nr = gameState.playerRow;
    let moved = false;
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      if (dir.x < 0 && nc > 0 && hasPlatformAt(this.currentLevel, nc - 1, nr)) { nc--; moved = true; }
      else if (dir.x > 0 && nc < GRID_COLS - 1 && hasPlatformAt(this.currentLevel, nc + 1, nr)) { nc++; moved = true; }
    } else {
      if (dir.y > 0 && canLadderUp(this.currentLevel, nc, nr)) { nr++; moved = true; }
      else if (dir.y < 0 && canLadderDown(this.currentLevel, nc, nr)) { nr--; moved = true; }
    }
    if (moved) {
      gameState.playerCol = nc;
      gameState.playerRow = nr;
      const [tx, ty] = gridToWorld(nc, nr);
      this.playerTargetX = tx;
      this.playerTargetY = ty;
      this.moveCooldown = 0.12;
      gameState.sfxAction = 'step';
      gameState.playerOnLadder = hasLadderAt(this.currentLevel, nc, nr);
      this.checkIngredientWalk(nc, nr);
    }
  }

  private checkIngredientWalk(col: number, row: number) {
    for (const ing of gameState.ingredients) {
      if (ing.complete || ing.dropping) continue;
      if (ing.currentRow !== row) continue;
      const sIdx = col - ing.def.col;
      if (sIdx >= 0 && sIdx < ing.def.width && !ing.sectionsWalked[sIdx]) {
        ing.sectionsWalked[sIdx] = true;
        gameState.sfxAction = 'walk_ingredient';
        if (ing.sectionMeshes[sIdx]) ing.sectionMeshes[sIdx].position.y -= 0.015;
        if (ing.sectionsWalked.every(w => w)) this.dropIngredient(ing);
      }
    }
  }

  private findIngredientTarget(ing: IngredientState): number {
    // Find lowest row: either plate (0) or just above highest stacked ingredient in same burger
    const sameCol = gameState.ingredients
      .filter(o => o !== ing && o.def.burgerIdx === ing.def.burgerIdx && o.complete)
      .map(o => o.currentRow)
      .sort((a, b) => b - a);
    if (sameCol.length > 0) return sameCol[0] + 1;
    return 0;
  }

  private dropIngredient(ing: IngredientState) {
    const targetRow = this.findIngredientTarget(ing);
    const crushed = this.checkCrushOnDrop(ing, ing.currentRow, targetRow);
    ing.dropping = true;
    ing.dropStartRow = ing.currentRow;
    ing.dropTarget = targetRow;
    ing.dropProgress = 0;
    gameState.score += 50 * (gameState.combo + 1);
    gameState.combo++;
    gameState.comboTimer = 3;
    if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    gameState.sfxAction = 'drop';
    if (crushed >= 2) {
      if (!gameState.achievements['double_crush']) {
        gameState.achievements['double_crush'] = true;
        gameState.sfxAction = 'achievement';
        gameState.saveStats();
      }
    }
  }

  private checkCrushOnDrop(ing: IngredientState, fromRow: number, toRow: number): number {
    let crushed = 0;
    for (const enemy of gameState.enemies) {
      if (enemy.dead) continue;
      if (enemy.gridCol >= ing.def.col && enemy.gridCol < ing.def.col + ing.def.width) {
        if (enemy.gridRow <= fromRow && enemy.gridRow >= toRow) {
          enemy.dead = true;
          enemy.respawnTimer = 5;
          enemy.mesh.visible = false;
          crushed++;
          gameState.score += 500 * crushed;
          gameState.sfxAction = 'crush';
          gameState.totalCrushAll++;
        }
      }
    }
    return crushed;
  }

  private updateIngredients(delta: number) {
    for (const ing of gameState.ingredients) {
      if (!ing.dropping) continue;
      ing.dropProgress += delta * 3;
      if (ing.dropProgress >= 1) {
        ing.dropping = false;
        ing.currentRow = ing.dropTarget;
        ing.sectionsWalked.fill(false);
        if (ing.currentRow <= 1) {
          ing.complete = true;
          gameState.totalBurgersAll++;
          gameState.sfxAction = 'burger_complete';
          const allDone = gameState.ingredients
            .filter(o => o.def.burgerIdx === ing.def.burgerIdx)
            .every(o => o.complete);
          if (allDone) {
            this.burgersCompleted++;
            gameState.score += 1000;
            gameState.sfxAction = 'burger_stack';
            if (this.burgersCompleted >= this.burgersNeeded) this.levelWon();
          }
        }
        this.checkCascade(ing);
        this.repositionIngredient(ing);
      } else {
        const startY = gridToWorld(0, ing.dropStartRow)[1] - CELL_H * 0.25;
        const endY = gridToWorld(0, ing.dropTarget)[1] - CELL_H * 0.25;
        const curY = startY + (endY - startY) * ing.dropProgress;
        for (let s = 0; s < ing.sectionMeshes.length; s++) {
          ing.sectionMeshes[s].position.y = curY;
        }
      }
    }
  }

  private checkCascade(droppedIng: IngredientState) {
    for (const other of gameState.ingredients) {
      if (other === droppedIng || other.complete || other.dropping) continue;
      if (other.def.burgerIdx !== droppedIng.def.burgerIdx) continue;
      if (other.currentRow === droppedIng.currentRow ||
          other.currentRow === droppedIng.currentRow - 1) {
        const target = this.findIngredientTarget(other);
        if (target < other.currentRow) {
          other.dropping = true;
          other.dropStartRow = other.currentRow;
          other.dropTarget = Math.max(0, target);
          other.dropProgress = 0;
          other.sectionsWalked.fill(false);
          gameState.score += 100;
          gameState.sfxAction = 'cascade';
          if (!gameState.achievements['cascade']) {
            gameState.achievements['cascade'] = true;
            gameState.sfxAction = 'achievement';
            gameState.saveStats();
          }
        }
      }
    }
  }

  private repositionIngredient(ing: IngredientState) {
    for (let s = 0; s < ing.sectionMeshes.length; s++) {
      const [sx, sy, sz] = gridToWorld(ing.def.col + s, ing.currentRow);
      ing.sectionMeshes[s].position.set(sx, sy - CELL_H * 0.25, sz + 0.03);
    }
    if (ing.complete) {
      for (const m of ing.sectionMeshes) {
        const mt = m.material as MeshStandardMaterial;
        mt.opacity = 1.0;
        mt.emissive = new Color(ingredientColor(ing.def.type)).multiplyScalar(0.5);
      }
    }
  }

  private updateEnemies(delta: number) {
    for (const enemy of gameState.enemies) {
      if (enemy.dead) {
        enemy.respawnTimer -= delta;
        if (enemy.respawnTimer <= 0) {
          enemy.dead = false;
          enemy.mesh.visible = true;
          enemy.gridCol = Math.floor(Math.random() * GRID_COLS);
          enemy.gridRow = GRID_ROWS - 1;
          const [rx, ry, rz] = gridToWorld(enemy.gridCol, enemy.gridRow);
          enemy.mesh.position.set(rx, ry, rz + 0.05);
        }
        continue;
      }
      if (enemy.stunned) {
        enemy.stunTimer -= delta;
        if (enemy.stunTimer <= 0) {
          enemy.stunned = false;
          const body = enemy.mesh.children[0] as Mesh;
          if (body) {
            (body.material as MeshStandardMaterial).emissive =
              new Color(enemyColor(enemy.type)).multiplyScalar(0.4);
          }
        }
        continue;
      }
      enemy.moveTimer -= delta;
      if (enemy.moveTimer <= 0) {
        enemy.moveTimer = 1.0 / enemy.speed;
        this.moveEnemy(enemy);
      }
      const [tx, ty] = gridToWorld(enemy.gridCol, enemy.gridRow);
      enemy.mesh.position.x += (tx - enemy.mesh.position.x) * delta * 6;
      enemy.mesh.position.y += (ty - enemy.mesh.position.y) * delta * 6;
      enemy.mesh.position.y += Math.sin(performance.now() / 200) * 0.003;
    }
  }

  private moveEnemy(enemy: EnemyState) {
    const dx = gameState.playerCol - enemy.gridCol;
    const dy = gameState.playerRow - enemy.gridRow;
    const tryV = Math.random() < 0.4 || Math.abs(dy) > Math.abs(dx);
    if (tryV && dy !== 0) {
      if (dy > 0 && canLadderUp(this.currentLevel, enemy.gridCol, enemy.gridRow)) { enemy.gridRow++; return; }
      if (dy < 0 && canLadderDown(this.currentLevel, enemy.gridCol, enemy.gridRow)) { enemy.gridRow--; return; }
    }
    if (dx !== 0) {
      const nc = enemy.gridCol + (dx > 0 ? 1 : -1);
      if (nc >= 0 && nc < GRID_COLS && hasPlatformAt(this.currentLevel, nc, enemy.gridRow)) {
        enemy.gridCol = nc;
        return;
      }
    }
    const dirs: [number, number][] = [];
    if (enemy.gridCol > 0 && hasPlatformAt(this.currentLevel, enemy.gridCol - 1, enemy.gridRow)) dirs.push([-1, 0]);
    if (enemy.gridCol < GRID_COLS - 1 && hasPlatformAt(this.currentLevel, enemy.gridCol + 1, enemy.gridRow)) dirs.push([1, 0]);
    if (canLadderUp(this.currentLevel, enemy.gridCol, enemy.gridRow)) dirs.push([0, 1]);
    if (canLadderDown(this.currentLevel, enemy.gridCol, enemy.gridRow)) dirs.push([0, -1]);
    if (dirs.length > 0) {
      const [ddx, ddy] = dirs[Math.floor(Math.random() * dirs.length)];
      enemy.gridCol += ddx;
      enemy.gridRow += ddy;
    }
  }

  private checkPlayerEnemyCollision() {
    if (gameState.mode === 'zen') return;
    for (const enemy of gameState.enemies) {
      if (enemy.dead || enemy.stunned) continue;
      if (enemy.gridCol === gameState.playerCol && enemy.gridRow === gameState.playerRow) {
        this.playerDie();
        return;
      }
    }
  }

  private playerDie() {
    gameState.lives--;
    gameState.levelDeaths++;
    gameState.totalDeathsAll++;
    gameState.sfxAction = 'death';
    if (gameState.lives <= 0) { this.endGame(); return; }
    gameState.playerCol = this.currentLevel.playerStart.col;
    gameState.playerRow = this.currentLevel.playerStart.row;
    const [px, py] = gridToWorld(gameState.playerCol, gameState.playerRow);
    this.playerTargetX = px;
    this.playerTargetY = py;
    for (let i = 0; i < gameState.enemies.length; i++) {
      const e = gameState.enemies[i];
      const def = this.currentLevel.enemies[i % this.currentLevel.enemies.length];
      e.gridCol = def.col;
      e.gridRow = def.row;
      e.dead = false;
      e.stunned = false;
      e.mesh.visible = true;
      const [ex, ey, ez] = gridToWorld(def.col, def.row);
      e.mesh.position.set(ex, ey, ez + 0.05);
    }
  }

  private usePepper() {
    if (gameState.peppers <= 0) return;
    gameState.peppers--;
    gameState.levelPeppersUsed++;
    gameState.totalPeppersAll++;
    gameState.sfxAction = 'pepper';
    if (this.pepperCloud) this.fieldGroup.remove(this.pepperCloud);
    const cGeom = new SphereGeometry(CELL_W * 0.6, 8, 6);
    const cMat = new MeshStandardMaterial({
      color: 0xffff88, emissive: new Color(0xffff44).multiplyScalar(0.6),
      transparent: true, opacity: 0.5,
    });
    this.pepperCloud = new Mesh(cGeom, cMat);
    const [px, py, pz] = gridToWorld(gameState.playerCol, gameState.playerRow);
    this.pepperCloud.position.set(px, py, pz + 0.08);
    this.fieldGroup.add(this.pepperCloud);
    this.pepperTimer = 0.8;
    for (const enemy of gameState.enemies) {
      if (enemy.dead || enemy.stunned) continue;
      const dist = Math.abs(enemy.gridCol - gameState.playerCol) + Math.abs(enemy.gridRow - gameState.playerRow);
      if (dist <= 2) {
        enemy.stunned = true;
        enemy.stunTimer = 3;
        const body = enemy.mesh.children[0] as Mesh;
        if (body) (body.material as MeshStandardMaterial).emissive.set(0x888800);
      }
    }
    gameState.checkAchievements();
  }

  private levelWon() {
    gameState.levelComplete = true;
    gameState.totalLevelsAll++;
    gameState.score += 2000 + gameState.level * 500;
    const lt = gameState.levelTime;
    if (lt < gameState.fastestLevel) gameState.fastestLevel = lt;
    if (gameState.levelDeaths === 0) gameState.cleanLevels++;
    if (gameState.levelPeppersUsed === 0) gameState.noPepperLevels++;
    gameState.peppers = Math.min(gameState.peppers + 2, 10);
    if (gameState.level > gameState.bestLevel) gameState.bestLevel = gameState.level;
    if (gameState.score > gameState.bestScore) gameState.bestScore = gameState.score;
    if (gameState.maxCombo > gameState.bestCombo) gameState.bestCombo = gameState.maxCombo;
    gameState.checkAchievements();
    gameState.saveStats();
    gameState.sfxAction = 'level_complete';
    this.levelAdvanceTimer = 2.0;
  }

  private endGame() {
    gameState.totalScoreAll += gameState.score;
    if (gameState.score > gameState.bestScore) gameState.bestScore = gameState.score;
    if (gameState.level > gameState.bestLevel) gameState.bestLevel = gameState.level;
    if (gameState.maxCombo > gameState.bestCombo) gameState.bestCombo = gameState.maxCombo;
    gameState.checkAchievements();
    gameState.saveStats();
    gameState.sfxAction = 'gameover';
    gameState.screen = 'results';
  }

  private updatePlayerMeshPosition(delta: number) {
    if (!this.playerMesh) return;
    const f = 1 - Math.exp(-8 * delta);
    this.playerMesh.position.x += (this.playerTargetX - this.playerMesh.position.x) * f;
    this.playerMesh.position.y += (this.playerTargetY - this.playerMesh.position.y) * f;
  }
}
