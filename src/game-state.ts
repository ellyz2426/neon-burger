// Neon Burger VR — Shared game state & types
export type GameMode = 'arcade' | 'speed' | 'zen' | 'challenge';
export type Difficulty = 'normal' | 'hard' | 'insane';

export const COLOR_SCHEMES = [0x00ffff, 0x44ff88, 0xff44aa, 0xffcc00];
export const COLOR_NAMES = ['CYAN', 'GREEN', 'PINK', 'GOLD'];

// Grid constants
export const GRID_COLS = 13;
export const GRID_ROWS = 6;
export const CELL_W = 0.27;
export const CELL_H = 0.38;
export const FIELD_X = 0;
export const FIELD_Y = 1.7;
export const FIELD_Z = -3.5;

export function gridToWorld(col: number, row: number): [number, number, number] {
  const x = FIELD_X + (col - (GRID_COLS - 1) / 2) * CELL_W;
  const y = FIELD_Y + (row - (GRID_ROWS - 1) / 2) * CELL_H;
  return [x, y, FIELD_Z];
}

// Level data types
export interface PlatformSeg { row: number; startCol: number; endCol: number }
export interface LadderSeg { col: number; startRow: number; endRow: number }
export interface IngredientDef { burgerIdx: number; type: string; row: number; col: number; width: number }
export interface EnemyDef { type: string; col: number; row: number }

export interface LevelData {
  platforms: PlatformSeg[];
  ladders: LadderSeg[];
  ingredients: IngredientDef[];
  plates: { col: number; width: number }[];
  playerStart: { col: number; row: number };
  enemies: EnemyDef[];
}

export function getLevel(n: number): LevelData {
  const base: LevelData = {
    platforms: [
      { row: 5, startCol: 0, endCol: 12 },
      { row: 4, startCol: 0, endCol: 5 },
      { row: 4, startCol: 7, endCol: 12 },
      { row: 3, startCol: 0, endCol: 12 },
      { row: 2, startCol: 0, endCol: 5 },
      { row: 2, startCol: 7, endCol: 12 },
      { row: 1, startCol: 0, endCol: 12 },
      { row: 0, startCol: 0, endCol: 12 },
    ],
    ladders: [
      { col: 0, startRow: 0, endRow: 5 },
      { col: 2, startRow: 0, endRow: 3 },
      { col: 5, startRow: 2, endRow: 5 },
      { col: 6, startRow: 0, endRow: 2 },
      { col: 7, startRow: 2, endRow: 5 },
      { col: 10, startRow: 0, endRow: 3 },
      { col: 12, startRow: 0, endRow: 5 },
    ],
    ingredients: [
      { burgerIdx: 0, type: 'bun_top', row: 5, col: 0, width: 3 },
      { burgerIdx: 0, type: 'lettuce', row: 3, col: 0, width: 3 },
      { burgerIdx: 0, type: 'patty', row: 1, col: 0, width: 3 },
      { burgerIdx: 1, type: 'bun_top', row: 5, col: 3, width: 3 },
      { burgerIdx: 1, type: 'tomato', row: 4, col: 3, width: 3 },
      { burgerIdx: 1, type: 'patty', row: 2, col: 3, width: 3 },
      { burgerIdx: 2, type: 'bun_top', row: 5, col: 7, width: 3 },
      { burgerIdx: 2, type: 'lettuce', row: 4, col: 7, width: 3 },
      { burgerIdx: 2, type: 'patty', row: 2, col: 7, width: 3 },
      { burgerIdx: 3, type: 'bun_top', row: 5, col: 10, width: 3 },
      { burgerIdx: 3, type: 'tomato', row: 3, col: 10, width: 3 },
      { burgerIdx: 3, type: 'patty', row: 1, col: 10, width: 3 },
    ],
    plates: [
      { col: 0, width: 3 },
      { col: 3, width: 3 },
      { col: 7, width: 3 },
      { col: 10, width: 3 },
    ],
    playerStart: { col: 6, row: 3 },
    enemies: [
      { type: 'hotdog', col: 0, row: 5 },
      { type: 'pickle', col: 12, row: 5 },
    ],
  };
  if (n >= 2) base.enemies.push({ type: 'egg', col: 6, row: 5 });
  if (n >= 4) base.enemies.push({ type: 'hotdog', col: 3, row: 5 });
  if (n >= 6) base.enemies.push({ type: 'pickle', col: 9, row: 5 });
  if (n >= 8) base.enemies.push({ type: 'egg', col: 0, row: 5 });
  return base;
}

export function ingredientColor(type: string): number {
  switch (type) {
    case 'bun_top': case 'bun_bottom': return 0xffaa22;
    case 'lettuce': return 0x44ff44;
    case 'tomato': return 0xff3333;
    case 'patty': return 0x884422;
    default: return 0xffffff;
  }
}

export function enemyColor(type: string): number {
  switch (type) {
    case 'hotdog': return 0xff4444;
    case 'pickle': return 0x44ff66;
    case 'egg': return 0xffff44;
    default: return 0xffffff;
  }
}

// Runtime states
export interface IngredientState {
  def: IngredientDef;
  currentRow: number;
  sectionsWalked: boolean[];
  dropping: boolean;
  dropProgress: number;
  dropStartRow: number;
  dropTarget: number;
  complete: boolean;
  sectionMeshes: any[];
}

export interface EnemyState {
  type: string;
  gridCol: number;
  gridRow: number;
  mesh: any;
  speed: number;
  stunned: boolean;
  stunTimer: number;
  dead: boolean;
  respawnTimer: number;
  moveTimer: number;
  onLadder: boolean;
}

// Achievements
export interface AchievementDef { id: string; name: string; desc: string }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_burger', name: 'Short Order', desc: 'Complete your first burger' },
  { id: 'first_level', name: 'Order Up!', desc: 'Clear level 1' },
  { id: 'first_crush', name: 'Squish!', desc: 'Crush an enemy with an ingredient' },
  { id: 'first_pepper', name: 'Spicy!', desc: 'Use pepper to stun an enemy' },
  { id: 'double_crush', name: 'Double Squish', desc: 'Crush 2+ enemies in one drop' },
  { id: 'cascade', name: 'Chain Reaction', desc: 'Trigger a cascade drop' },
  { id: 'ten_burgers', name: 'Grill Master', desc: 'Complete 10 burgers total' },
  { id: 'fifty_burgers', name: 'Burger Baron', desc: 'Complete 50 burgers total' },
  { id: 'ten_crush', name: 'Pest Control', desc: 'Crush 10 enemies total' },
  { id: 'fifty_crush', name: 'Exterminator', desc: 'Crush 50 enemies total' },
  { id: 'score5k', name: 'Warming Up', desc: 'Score 5,000 points' },
  { id: 'score10k', name: 'High Score', desc: 'Score 10,000 points' },
  { id: 'score25k', name: 'Quarter Pounder', desc: 'Score 25,000 points' },
  { id: 'score50k', name: 'Big Mac Attack', desc: 'Score 50,000 points' },
  { id: 'level5', name: 'Halfway There', desc: 'Reach level 5' },
  { id: 'level10', name: 'Veteran Chef', desc: 'Reach level 10' },
  { id: 'no_death', name: 'Clean Kitchen', desc: 'Clear a level without dying' },
  { id: 'no_pepper', name: 'No Spice Needed', desc: 'Clear a level without pepper' },
  { id: 'five_games', name: 'Regular Customer', desc: 'Play 5 games' },
  { id: 'speedrun', name: 'Fast Food', desc: 'Clear a level in under 30s' },
];

// Game state singleton
export const gameState = {
  screen: 'menu' as string,
  mode: 'arcade' as GameMode,
  difficulty: 'normal' as Difficulty,
  score: 0,
  lives: 3,
  peppers: 5,
  level: 1,
  combo: 0,
  maxCombo: 0,
  comboTimer: 0,
  playerCol: 6,
  playerRow: 3,
  playerOnLadder: false,
  ingredients: [] as IngredientState[],
  enemies: [] as EnemyState[],
  levelComplete: false,
  levelDeaths: 0,
  levelPeppersUsed: 0,
  levelStartTime: 0,
  levelTime: 0,
  speedTimer: 120,
  colorScheme: 0,
  soundEnabled: true,
  musicEnabled: true,
  sfxAction: '' as string,
  totalGames: 0,
  totalScoreAll: 0,
  bestScore: 0,
  bestLevel: 0,
  bestCombo: 0,
  totalBurgersAll: 0,
  totalCrushAll: 0,
  totalPeppersAll: 0,
  totalLevelsAll: 0,
  totalDeathsAll: 0,
  cleanLevels: 0,
  noPepperLevels: 0,
  fastestLevel: 999,
  achievements: {} as Record<string, boolean>,

  get accentColor(): number { return COLOR_SCHEMES[this.colorScheme] ?? 0x00ffff; },
  get achievementsUnlocked(): string[] {
    return Object.keys(this.achievements).filter(k => this.achievements[k]);
  },

  loadStats() {
    try {
      const s = localStorage.getItem('neon-burger-stats');
      if (!s) return;
      const d = JSON.parse(s);
      this.totalGames = d.totalGames ?? 0;
      this.totalScoreAll = d.totalScoreAll ?? 0;
      this.bestScore = d.bestScore ?? 0;
      this.bestLevel = d.bestLevel ?? 0;
      this.bestCombo = d.bestCombo ?? 0;
      this.totalBurgersAll = d.totalBurgersAll ?? 0;
      this.totalCrushAll = d.totalCrushAll ?? 0;
      this.totalPeppersAll = d.totalPeppersAll ?? 0;
      this.totalLevelsAll = d.totalLevelsAll ?? 0;
      this.totalDeathsAll = d.totalDeathsAll ?? 0;
      this.cleanLevels = d.cleanLevels ?? 0;
      this.noPepperLevels = d.noPepperLevels ?? 0;
      this.fastestLevel = d.fastestLevel ?? 999;
      this.achievements = d.achievements ?? {};
      this.soundEnabled = d.soundEnabled ?? true;
      this.musicEnabled = d.musicEnabled ?? true;
      this.colorScheme = d.colorScheme ?? 0;
    } catch { /* ignore */ }
  },

  saveStats() {
    try {
      localStorage.setItem('neon-burger-stats', JSON.stringify({
        totalGames: this.totalGames, totalScoreAll: this.totalScoreAll,
        bestScore: this.bestScore, bestLevel: this.bestLevel, bestCombo: this.bestCombo,
        totalBurgersAll: this.totalBurgersAll, totalCrushAll: this.totalCrushAll,
        totalPeppersAll: this.totalPeppersAll, totalLevelsAll: this.totalLevelsAll,
        totalDeathsAll: this.totalDeathsAll, cleanLevels: this.cleanLevels,
        noPepperLevels: this.noPepperLevels, fastestLevel: this.fastestLevel,
        achievements: this.achievements, soundEnabled: this.soundEnabled,
        musicEnabled: this.musicEnabled, colorScheme: this.colorScheme,
      }));
    } catch { /* ignore */ }
  },

  checkAchievements() {
    const ck = (id: string, cond: boolean) => {
      if (!this.achievements[id] && cond) {
        this.achievements[id] = true;
        this.sfxAction = 'achievement';
        this.saveStats();
      }
    };
    ck('first_burger', this.totalBurgersAll >= 1);
    ck('ten_burgers', this.totalBurgersAll >= 10);
    ck('fifty_burgers', this.totalBurgersAll >= 50);
    ck('first_crush', this.totalCrushAll >= 1);
    ck('ten_crush', this.totalCrushAll >= 10);
    ck('fifty_crush', this.totalCrushAll >= 50);
    ck('first_pepper', this.totalPeppersAll >= 1);
    ck('score5k', this.bestScore >= 5000);
    ck('score10k', this.bestScore >= 10000);
    ck('score25k', this.bestScore >= 25000);
    ck('score50k', this.bestScore >= 50000);
    ck('level5', this.bestLevel >= 5);
    ck('level10', this.bestLevel >= 10);
    ck('no_death', this.cleanLevels >= 1);
    ck('no_pepper', this.noPepperLevels >= 1);
    ck('five_games', this.totalGames >= 5);
    ck('speedrun', this.fastestLevel <= 30);
    ck('first_level', this.totalLevelsAll >= 1);
  },
};
