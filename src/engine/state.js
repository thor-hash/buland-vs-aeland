const SAVE_KEY = 'buland-vs-aeland-save';

const DEFAULT_STATE = {
  team: null,        // 'buland' | 'aeland'
  character: null,   // character id
  day: 1,
  currentLocation: null,
  currentMap: null,   // 'buland' | 'aeland'
  stats: {
    emotional: 30,
    money: 20,
    happiness: 35,
    sex: 15,
  },
  visitedLocations: [],
  flags: {},
};

class GameState {
  constructor() {
    this._state = { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats } };
    this._listeners = new Map();
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    this._state[key] = value;
    this._notify(key, value);
  }

  getStat(stat) {
    return this._state.stats[stat] || 0;
  }

  setStat(stat, value) {
    this._state.stats[stat] = Math.max(0, Math.min(100, value));
    this._notify('stats', this._state.stats);
  }

  addStat(stat, amount) {
    this.setStat(stat, this.getStat(stat) + amount);
  }

  getStats() {
    return { ...this._state.stats };
  }

  on(key, fn) {
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key).delete(fn);
  }

  _notify(key, value) {
    const fns = this._listeners.get(key);
    if (fns) fns.forEach(fn => fn(value));
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this._state));
    } catch (e) { /* ignore */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(this._state, data);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  reset() {
    this._state = { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats }, visitedLocations: [] };
    localStorage.removeItem(SAVE_KEY);
  }
}

export const gameState = new GameState();
