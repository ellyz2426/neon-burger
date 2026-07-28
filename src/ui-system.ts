// Neon Burger VR — UI system (PanelUI spatial panels)
import {
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
} from '@iwsdk/core';
import { Group } from 'three';
import {
  gameState,
  ACHIEVEMENTS,
  COLOR_NAMES,
  GameMode,
  Difficulty,
} from './game-state.js';

type Screen =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'results'
  | 'settings'
  | 'tutorial'
  | 'stats'
  | 'achievements'
  | 'newgame'
  | 'nextlevel';

interface PanelEntry {
  entity: any;
  group: Group;
  doc: UIKitDocument | null;
  bound: boolean;
}

// Panel Z positions: camera at Z=1.0, game field at Z=-3.5
const OVERLAY_Z = -0.6;
const HUD_Y = 3.4;
const HUD_Z = -3.5;

const PANEL_CONFIGS: Record<string, { config: string; y: number; z: number }> = {
  menu: { config: './ui/menu.json', y: 1.8, z: OVERLAY_Z },
  hud: { config: './ui/hud.json', y: HUD_Y, z: HUD_Z },
  pause: { config: './ui/pause.json', y: 1.8, z: OVERLAY_Z },
  results: { config: './ui/results.json', y: 1.8, z: OVERLAY_Z },
  settings: { config: './ui/settings.json', y: 1.8, z: OVERLAY_Z },
  tutorial: { config: './ui/tutorial.json', y: 1.8, z: OVERLAY_Z },
  stats: { config: './ui/stats.json', y: 1.8, z: OVERLAY_Z },
  achv: { config: './ui/achv.json', y: 1.8, z: OVERLAY_Z },
};

export class UISystem extends createSystem({
  panels: { required: [PanelUI, PanelDocument] },
}) {
  private entries: Record<string, PanelEntry> = {};
  private lastScreen: Screen = 'menu';

  init() {
    for (const [name, cfg] of Object.entries(PANEL_CONFIGS)) {
      const group = new Group();
      group.position.set(0, cfg.y, cfg.z);
      group.visible = name === 'menu';
      const entity = (this.world as any).createTransformEntity(group);
      entity.addComponent(PanelUI, { config: cfg.config });
      this.entries[name] = { entity, group, doc: null, bound: false };
    }

    this.queries.panels.subscribe('qualify', (entity: any) => {
      for (const [name, entry] of Object.entries(this.entries)) {
        if (entity.index === entry.entity.index && !entry.bound) {
          const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
          if (!doc) return;
          entry.doc = doc;
          entry.bound = true;
          this.bindPanel(name, doc);
        }
      }
    });
  }

  private bindPanel(name: string, doc: UIKitDocument) {
    switch (name) {
      case 'menu': this.bindMenu(doc); break;
      case 'pause': this.bindPause(doc); break;
      case 'results': this.bindResults(doc); break;
      case 'settings': this.bindSettings(doc); break;
      case 'tutorial': this.bindTutorial(doc); break;
      case 'stats': this.bindStats(doc); break;
      case 'achv': this.bindAchievements(doc); break;
    }
  }

  private bindMenu(doc: UIKitDocument) {
    const startMode = (mode: GameMode) => {
      gameState.mode = mode;
      gameState.screen = 'newgame';
    };
    this.addClick(doc, 'btn-arcade', () => startMode('arcade'));
    this.addClick(doc, 'btn-speed', () => startMode('speed'));
    this.addClick(doc, 'btn-zen', () => startMode('zen'));
    this.addClick(doc, 'btn-challenge', () => startMode('challenge'));
    this.addClick(doc, 'btn-tutorial', () => { gameState.screen = 'tutorial' as any; });
    this.addClick(doc, 'btn-settings', () => { gameState.screen = 'settings' as any; });
    this.addClick(doc, 'btn-stats', () => { gameState.screen = 'stats' as any; });
    this.addClick(doc, 'btn-achv', () => { gameState.screen = 'achievements' as any; });
  }

  private bindPause(doc: UIKitDocument) {
    this.addClick(doc, 'btn-resume', () => { gameState.screen = 'playing'; });
    this.addClick(doc, 'btn-quit', () => { gameState.screen = 'menu'; });
  }

  private bindResults(doc: UIKitDocument) {
    this.addClick(doc, 'btn-retry', () => { gameState.screen = 'newgame'; });
    this.addClick(doc, 'btn-menu', () => { gameState.screen = 'menu'; });
  }

  private bindSettings(doc: UIKitDocument) {
    const setDiff = (d: Difficulty) => {
      gameState.difficulty = d;
      this.updateSettingsText(doc);
    };
    this.addClick(doc, 'btn-diff-normal', () => setDiff('normal'));
    this.addClick(doc, 'btn-diff-hard', () => setDiff('hard'));
    this.addClick(doc, 'btn-diff-insane', () => setDiff('insane'));
    this.addClick(doc, 'btn-sound', () => {
      gameState.soundEnabled = !gameState.soundEnabled;
      gameState.saveStats();
      this.updateSettingsText(doc);
    });
    this.addClick(doc, 'btn-music', () => {
      gameState.musicEnabled = !gameState.musicEnabled;
      gameState.saveStats();
      this.updateSettingsText(doc);
    });
    this.addClick(doc, 'btn-color', () => {
      gameState.colorScheme = (gameState.colorScheme + 1) % COLOR_NAMES.length;
      gameState.saveStats();
      this.updateSettingsText(doc);
    });
    this.addClick(doc, 'btn-settings-back', () => { gameState.screen = 'menu'; });
  }

  private bindTutorial(doc: UIKitDocument) {
    this.addClick(doc, 'btn-tutorial-back', () => { gameState.screen = 'menu'; });
  }

  private bindStats(doc: UIKitDocument) {
    this.addClick(doc, 'btn-stats-back', () => { gameState.screen = 'menu'; });
  }

  private bindAchievements(doc: UIKitDocument) {
    this.addClick(doc, 'btn-achv-back', () => { gameState.screen = 'menu'; });
  }

  private addClick(doc: UIKitDocument, id: string, handler: () => void) {
    const el = doc.getElementById(id) as UIKit.Text | undefined;
    el?.addEventListener('click', handler);
  }

  private setText(doc: UIKitDocument, id: string, text: string) {
    const el = doc.getElementById(id) as UIKit.Text | undefined;
    el?.setProperties({ text });
  }

  private updateSettingsText(doc: UIKitDocument) {
    this.setText(doc, 'set-diff', 'Difficulty: ' + gameState.difficulty.toUpperCase());
    this.setText(doc, 'set-sound', 'Sound: ' + (gameState.soundEnabled ? 'ON' : 'OFF'));
    this.setText(doc, 'set-music', 'Music: ' + (gameState.musicEnabled ? 'ON' : 'OFF'));
    this.setText(doc, 'set-color', 'Color: ' + (COLOR_NAMES[gameState.colorScheme] || 'CYAN'));
  }

  update() {
    const screen = gameState.screen as Screen;
    if (screen !== this.lastScreen) {
      this.lastScreen = screen;
      this.updateVisibility(screen);
      this.onScreenEnter(screen);
    }
    if (screen === 'playing') {
      this.updateHUD();
    }
  }

  private updateVisibility(screen: Screen) {
    const vis: Record<string, boolean> = {
      menu: screen === 'menu',
      hud: screen === 'playing',
      pause: screen === 'paused',
      results: screen === 'results',
      settings: (screen as string) === 'settings',
      tutorial: (screen as string) === 'tutorial',
      stats: (screen as string) === 'stats',
      achv: (screen as string) === 'achievements',
    };
    for (const [name, entry] of Object.entries(this.entries)) {
      entry.group.visible = vis[name] || false;
    }
  }

  private onScreenEnter(screen: Screen) {
    if ((screen as string) === 'results') this.updateResults();
    if ((screen as string) === 'settings' && this.entries.settings?.doc) {
      this.updateSettingsText(this.entries.settings.doc);
    }
    if ((screen as string) === 'stats') this.updateStats();
    if ((screen as string) === 'achievements') this.updateAchievementsList();
  }

  private updateHUD() {
    const doc = this.entries.hud?.doc;
    if (!doc) return;
    this.setText(doc, 'hud-score', 'Score: ' + gameState.score);
    this.setText(doc, 'hud-level', 'Level ' + gameState.level);
    this.setText(doc, 'hud-lives', 'Lives: ' + gameState.lives);
    this.setText(doc, 'hud-pepper', 'Pepper: ' + gameState.peppers);
    this.setText(doc, 'hud-combo', gameState.combo > 0 ? 'x' + gameState.combo + ' COMBO' : '');
    if (gameState.mode === 'speed') {
      this.setText(doc, 'hud-timer', 'Time: ' + Math.ceil(gameState.speedTimer) + 's');
    } else {
      this.setText(doc, 'hud-timer', '');
    }
  }

  private updateResults() {
    const doc = this.entries.results?.doc;
    if (!doc) return;
    this.setText(doc, 'res-score', 'Score: ' + gameState.score);
    this.setText(doc, 'res-level', 'Level: ' + gameState.level);
    this.setText(doc, 'res-combo', 'Best Combo: x' + gameState.maxCombo);
    this.setText(doc, 'res-best', 'Best Score: ' + gameState.bestScore);
  }

  private updateStats() {
    const doc = this.entries.stats?.doc;
    if (!doc) return;
    this.setText(doc, 'stat-games', 'Games Played: ' + gameState.totalGames);
    this.setText(doc, 'stat-score', 'Total Score: ' + gameState.totalScoreAll);
    this.setText(doc, 'stat-best', 'Best Score: ' + gameState.bestScore);
    this.setText(doc, 'stat-level', 'Best Level: ' + gameState.bestLevel);
    this.setText(doc, 'stat-burgers', 'Burgers Made: ' + gameState.totalBurgersAll);
    this.setText(doc, 'stat-crush', 'Enemies Crushed: ' + gameState.totalCrushAll);
    this.setText(doc, 'stat-pepper', 'Peppers Used: ' + gameState.totalPeppersAll);
    this.setText(doc, 'stat-deaths', 'Deaths: ' + gameState.totalDeathsAll);
  }

  private updateAchievementsList() {
    const doc = this.entries.achv?.doc;
    if (!doc) return;
    const unlocked = gameState.achievementsUnlocked.length;
    this.setText(doc, 'achv-count', unlocked + ' / ' + ACHIEVEMENTS.length);
    for (let i = 0; i < 10 && i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      const done = gameState.achievements[a.id];
      const prefix = done ? '[X]' : '[ ]';
      this.setText(doc, 'achv-' + i, prefix + ' ' + a.name + ' - ' + a.desc);
    }
  }
}
