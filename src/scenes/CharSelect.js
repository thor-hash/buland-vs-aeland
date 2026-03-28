import { sceneManager } from '../engine/scenes.js';
import { gameState } from '../engine/state.js';
import { CHARACTERS, TEAMS } from '../data/characters.js';
import { START_LOCATIONS } from '../data/locations.js';

const STAT_COLORS = {
  emotional: 'var(--stat-emotional)',
  money: 'var(--stat-money)',
  happiness: 'var(--stat-happiness)',
  sex: 'var(--stat-sex)',
};
const STAT_KEYS = ['emotional', 'money', 'happiness', 'sex'];

let selectedId = null;

function create(root) {
  const el = document.createElement('div');
  el.className = 'char-select';
  el.innerHTML = `
    <div class="char-select__header">
      <div class="char-select__team-name"></div>
      <div class="char-select__instruction">Veldu persónu</div>
    </div>
    <div class="char-grid"></div>
    <button class="char-select__confirm">Velja</button>
    <button class="char-select__back">← Til baka</button>
  `;

  el.querySelector('.char-select__back').addEventListener('click', () => {
    sceneManager.go('mainMenu');
  });

  el.querySelector('.char-select__confirm').addEventListener('click', () => {
    if (!selectedId) return;
    const char = CHARACTERS.find(c => c.id === selectedId);
    if (!char || char.locked) return;

    gameState.set('character', selectedId);
    const team = gameState.get('team');
    const startLoc = START_LOCATIONS[team];
    gameState.set('currentLocation', startLoc);
    gameState.set('currentMap', team);

    // Set starting stats based on character strengths
    const stats = { emotional: 25, money: 20, happiness: 25, sex: 15 };
    char.strengths.forEach(s => { stats[s] = Math.min(100, (stats[s] || 0) + 15); });
    Object.entries(stats).forEach(([k, v]) => gameState.setStat(k, v));

    gameState.save();
    sceneManager.go('mapView');
  });

  return el;
}

function onEnter(data) {
  selectedId = null;
  const el = this.el;
  const team = data?.team || gameState.get('team');
  const teamData = TEAMS[team];
  const chars = CHARACTERS.filter(c => c.team === team);

  const teamClass = team === 'buland' ? 'buland' : 'aeland';

  const nameEl = el.querySelector('.char-select__team-name');
  nameEl.textContent = `${teamData.emoji} ${teamData.name}`;
  nameEl.className = `char-select__team-name ${teamClass}`;

  const confirmBtn = el.querySelector('.char-select__confirm');
  confirmBtn.className = `char-select__confirm ${teamClass}-team`;
  confirmBtn.classList.remove('ready');

  const grid = el.querySelector('.char-grid');
  grid.innerHTML = '';

  chars.forEach(char => {
    const card = document.createElement('div');
    card.className = `char-card ${teamClass}-team`;
    if (char.locked) card.style.opacity = '0.5';
    card.dataset.id = char.id;

    const pips = STAT_KEYS.map(s => {
      const strong = char.strengths.includes(s);
      return `<div class="char-stat-pip ${strong ? 'strong' : ''}" style="background:${STAT_COLORS[s]}"></div>`;
    }).join('');

    card.innerHTML = `
      <div class="char-avatar" style="background:${char.avatar_bg}">${char.emoji}</div>
      <div class="char-info">
        <div class="char-info__name">${char.name}${char.locked ? ' 🔒' : ''}</div>
        <div class="char-info__role">${char.role}</div>
        <div class="char-info__ability">${char.ability}</div>
        <div class="char-info__stats">${pips}</div>
      </div>
    `;

    if (!char.locked) {
      card.addEventListener('click', () => {
        selectedId = char.id;
        grid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        confirmBtn.classList.add('ready');
        confirmBtn.textContent = `Velja ${char.name}`;
      });
    }

    grid.appendChild(card);
  });
}

export const CharSelect = { create, onEnter };
