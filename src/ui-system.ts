import { createSystem, PanelUI, PanelDocument } from '@iwsdk/core';
import { Group } from 'three';
import { Text, Container } from '@pmndrs/uikit';
import { gameState, ACHIEVEMENTS } from './game-state.js';

interface PanelEntry {
  doc: any;
  name: string;
  object3D: any;
}

export class UISystem extends createSystem({
  panels: { required: [PanelUI, PanelDocument] },
}) {
  private panelMap: Map<string, PanelEntry> = new Map();
  private currentScreen = 'menu';
  private loadedCount = 0;
  private fc = 0;

  private panelConfigs = [
    'menu', 'hud', 'pause', 'results', 'settings', 'tutorial', 'stats', 'achv'
  ];

  init() {
    for (const name of this.panelConfigs) {
      const g = new Group();
      g.position.set(0, 2.0, -1.0);
      g.visible = (name === 'menu');
      const entity = (this.world as any).createTransformEntity(g);
      entity.addComponent(PanelUI, { config: `./ui/${name}.json` });
    }

    (this as any).queries.panels.subscribe('qualify', (e: any) => {
      const doc = PanelDocument.data.document[e.index];
      const config = PanelUI.data.config[e.index];
      const name = config.replace('./ui/', '').replace('.json', '');
      this.panelMap.set(name, { doc, name, object3D: e.object3D });
      this.loadedCount++;
      if (this.loadedCount === this.panelConfigs.length) {
        this.wireButtons();
      }
    });
  }

  private wireButtons() {
    const startGame = (mode: string) => {
      gameState.mode = mode as any;
      gameState.screen = 'newgame';
    };

    this.wireBtn('menu', 'btn-arcade', () => startGame('arcade'));
    this.wireBtn('menu', 'btn-speed', () => startGame('speed'));
    this.wireBtn('menu', 'btn-zen', () => startGame('zen'));
    this.wireBtn('menu', 'btn-challenge', () => startGame('challenge'));
    this.wireBtn('menu', 'btn-tutorial', () => { gameState.screen = 'tutorial'; });
    this.wireBtn('menu', 'btn-settings', () => { gameState.screen = 'settings'; });
    this.wireBtn('menu', 'btn-stats', () => { gameState.screen = 'stats'; });
    this.wireBtn('menu', 'btn-achv', () => { gameState.screen = 'achievements'; });

    this.wireBtn('pause', 'btn-resume', () => { gameState.screen = 'playing'; });
    this.wireBtn('pause', 'btn-restart', () => { gameState.screen = 'newgame'; });
    this.wireBtn('pause', 'btn-quit', () => { gameState.screen = 'menu'; });

    this.wireBtn('results', 'btn-retry', () => { gameState.screen = 'newgame'; });
    this.wireBtn('results', 'btn-results-menu', () => { gameState.screen = 'menu'; });

    this.wireBtn('settings', 'btn-sfx-toggle', () => {
      gameState.soundEnabled = !gameState.soundEnabled;
      gameState.saveStats();
    });
    this.wireBtn('settings', 'btn-music-toggle', () => {
      gameState.musicEnabled = !gameState.musicEnabled;
      gameState.saveStats();
    });
    this.wireBtn('settings', 'btn-settings-back', () => { gameState.screen = 'menu'; });

    this.wireBtn('tutorial', 'btn-tutorial-back', () => { gameState.screen = 'menu'; });
    this.wireBtn('stats', 'btn-stats-back', () => { gameState.screen = 'menu'; });
    this.wireBtn('achv', 'btn-achv-back', () => { gameState.screen = 'menu'; });
  }

  private wireBtn(panelName: string, btnId: string, handler: () => void) {
    const entry = this.panelMap.get(panelName);
    if (!entry) return;
    const btn = entry.doc.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', handler);
    }
  }

  private screenToPanel(screen: string): string | null {
    switch (screen) {
      case 'menu': return 'menu';
      case 'playing': case 'newgame': case 'nextlevel': return 'hud';
      case 'paused': return 'pause';
      case 'results': return 'results';
      case 'settings': return 'settings';
      case 'tutorial': return 'tutorial';
      case 'stats': return 'stats';
      case 'achievements': return 'achv';
      default: return null;
    }
  }

  update(_delta: number) {
    this.fc++;
    if (this.loadedCount < this.panelConfigs.length) return;

    if (gameState.screen !== this.currentScreen) {
      const oldP = this.screenToPanel(this.currentScreen);
      const newP = this.screenToPanel(gameState.screen);

      if (oldP && oldP !== newP) {
        const e = this.panelMap.get(oldP);
        if (e) e.object3D.visible = false;
      }
      if (newP) {
        const e = this.panelMap.get(newP);
        if (e) e.object3D.visible = true;

        if (newP === 'results') this.updateResults();
        if (newP === 'stats') this.updateStats();
        if (newP === 'achv') this.updateAchievements();
        if (newP === 'settings') this.updateSettings();
      }
      this.currentScreen = gameState.screen;
    }

    if ((gameState.screen === 'playing' || gameState.screen === 'newgame' || gameState.screen === 'nextlevel') && this.fc % 3 === 0) {
      this.updateHUD();
    }
  }

  private setText(panelName: string, id: string, value: string) {
    const entry = this.panelMap.get(panelName);
    if (!entry) return;
    const el = entry.doc.getElementById(id);
    if (!el) return;
    if (el.properties?.signal?.text) {
      el.properties.signal.text.value = value;
    } else if (el.children) {
      for (const c of el.children) {
        if (c instanceof Text && c.properties?.signal?.text) {
          c.properties.signal.text.value = value;
          return;
        }
      }
    }
  }

  private updateHUD() {
    this.setText('hud', 'hud-score', `SCORE: ${gameState.score}`);
    this.setText('hud', 'hud-lives', `LIVES: ${gameState.lives}`);
    this.setText('hud', 'hud-pepper', `PEPPER: ${gameState.peppers}`);
    this.setText('hud', 'hud-level', `LEVEL ${gameState.level}`);
    if (gameState.combo > 1) {
      this.setText('hud', 'hud-combo', `COMBO x${gameState.combo}`);
    } else {
      this.setText('hud', 'hud-combo', '');
    }
    if (gameState.mode === 'speed') {
      const t = Math.max(0, gameState.speedTimer);
      this.setText('hud', 'hud-timer', `TIME: ${t.toFixed(1)}`);
    } else {
      this.setText('hud', 'hud-timer', '');
    }
  }

  private updateResults() {
    this.setText('results', 'results-title', gameState.lives <= 0 ? 'GAME OVER' : 'LEVEL COMPLETE');
    this.setText('results', 'results-score', `FINAL SCORE: ${gameState.score}`);
    this.setText('results', 'results-level', `LEVEL REACHED: ${gameState.level}`);
    this.setText('results', 'results-burgers', `CAREER BURGERS: ${gameState.totalBurgersAll}`);
    this.setText('results', 'results-enemies', `CAREER STUNS: ${gameState.totalCrushAll}`);
    this.setText('results', 'results-high', `HIGH SCORE: ${gameState.bestScore}`);
    if (gameState.score >= gameState.bestScore && gameState.score > 0) {
      this.setText('results', 'results-new', 'NEW HIGH SCORE!');
    } else {
      this.setText('results', 'results-new', '');
    }
  }

  private updateStats() {
    this.setText('stats', 'stat-games', `GAMES PLAYED: ${gameState.totalGames}`);
    this.setText('stats', 'stat-high', `HIGH SCORE: ${gameState.bestScore}`);
    this.setText('stats', 'stat-total', `TOTAL SCORE: ${gameState.totalScoreAll}`);
    this.setText('stats', 'stat-burgers', `BURGERS COMPLETED: ${gameState.totalBurgersAll}`);
    this.setText('stats', 'stat-enemies', `ENEMIES STUNNED: ${gameState.totalCrushAll}`);
    this.setText('stats', 'stat-maxlevel', `BEST LEVEL: ${gameState.bestLevel}`);
    this.setText('stats', 'stat-maxcombo', `BEST COMBO: ${gameState.bestCombo}x`);
    this.setText('stats', 'stat-time', `TOTAL LEVELS: ${gameState.totalLevelsAll}`);
  }

  private updateAchievements() {
    for (let i = 0; i < ACHIEVEMENTS.length && i < 5; i++) {
      const a = ACHIEVEMENTS[i];
      const unlocked = !!gameState.achievements[a.id];
      this.setText('achv', `achv-${i}-name`, a.name);
      this.setText('achv', `achv-${i}-desc`, a.desc);
      this.setText('achv', `achv-${i}-status`, unlocked ? '[UNLOCKED]' : '[LOCKED]');
    }
  }

  private updateSettings() {
    this.setText('settings', 'sfx-status', gameState.soundEnabled ? 'ON' : 'OFF');
    this.setText('settings', 'music-status', gameState.musicEnabled ? 'ON' : 'OFF');
  }
}
