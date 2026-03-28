import { sceneManager } from '../engine/scenes.js';
import { gameState } from '../engine/state.js';

function create(root) {
  const el = document.createElement('div');
  el.className = 'main-menu';
  el.innerHTML = `
    <div style="opacity:0.4; font-size:3rem;">⚔️</div>
    <h1 class="main-menu__title">BÚLAND</h1>
    <div class="main-menu__vs">vs</div>
    <h1 class="main-menu__title" style="color: var(--buland-secondary);">ÆLAND</h1>
    <p class="main-menu__subtitle">Hver verður giftari?</p>
    <div style="height: 1rem;"></div>
    <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Veldu lið til að byrja</p>
    <div class="team-select">
      <button class="team-btn team-btn--buland" data-team="buland">
        🏔️ Búland
      </button>
      <button class="team-btn team-btn--aeland" data-team="aeland">
        ☀️ Æland
      </button>
    </div>
  `;

  el.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      gameState.set('team', team);
      sceneManager.go('charSelect', { team });
    });
  });

  return el;
}

export const MainMenu = { create };
