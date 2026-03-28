import { sceneManager } from '../engine/scenes.js';
import { gameState } from '../engine/state.js';
import { LOCATIONS, START_LOCATIONS } from '../data/locations.js';
import { CHARACTERS, TEAMS } from '../data/characters.js';

const STAT_META = [
  { key: 'emotional', icon: '❤️', color: 'var(--stat-emotional)', label: 'Emotional' },
  { key: 'money',     icon: '💰', color: 'var(--stat-money)',     label: 'Money' },
  { key: 'happiness', icon: '😊', color: 'var(--stat-happiness)', label: 'Happiness' },
  { key: 'sex',       icon: '🔥', color: 'var(--stat-sex)',       label: 'Sex' },
];

let mapState = {
  scale: 1,
  x: 0, y: 0,
  isDragging: false,
  startX: 0, startY: 0,
  startTX: 0, startTY: 0,
  pinchDist: 0,
  pinchScale: 1,
  imgW: 0, imgH: 0,
};

function create(root) {
  const el = document.createElement('div');
  el.className = 'map-view';
  el.innerHTML = `
    <div class="hud">
      <div class="hud__top">
        <div class="hud__character">
          <div class="hud__avatar"></div>
          <div>
            <div class="hud__name"></div>
            <div class="hud__team"></div>
          </div>
        </div>
        <div class="hud__day">Dagur 1</div>
        <button class="hud__toggle">▼</button>
      </div>
      <div class="hud__stats">
        ${STAT_META.map(s => `
          <div class="stat-bar" data-stat="${s.key}">
            <span class="stat-bar__icon">${s.icon}</span>
            <div class="stat-bar__track">
              <div class="stat-bar__fill" style="background:${s.color}; width:0%"></div>
            </div>
            <span class="stat-bar__value">0</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="map-container">
      <div class="map-image">
        <img src="" alt="map" />
      </div>
      <div class="player-marker">
        <div class="player-marker__dot"></div>
      </div>
    </div>

    <button class="map-switch">🗺️ Skipta korti</button>

    <div class="location-panel">
      <div class="location-panel__handle"></div>
      <div class="location-panel__name"></div>
      <div class="location-panel__desc"></div>
      <div class="location-panel__actions">
        <button class="location-panel__btn location-panel__btn--cancel">Loka</button>
        <button class="location-panel__btn location-panel__btn--travel">🚶 Ferðast</button>
      </div>
    </div>

    <div class="travel-overlay">
      <div class="travel-overlay__text">Ferðast...</div>
      <div class="travel-overlay__dots"><span></span><span></span><span></span></div>
    </div>
  `;

  setupHUDToggle(el);
  setupMapInteraction(el);
  setupMapSwitch(el);
  setupLocationPanel(el);

  return el;
}

function setupHUDToggle(el) {
  const hud = el.querySelector('.hud');
  const btn = el.querySelector('.hud__toggle');
  btn.addEventListener('click', () => {
    hud.classList.toggle('collapsed');
    btn.textContent = hud.classList.contains('collapsed') ? '▲' : '▼';
  });
}

function setupMapInteraction(el) {
  const container = el.querySelector('.map-container');
  const mapEl = el.querySelector('.map-image');

  // Touch drag
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      mapState.isDragging = true;
      mapState.startX = e.touches[0].clientX;
      mapState.startY = e.touches[0].clientY;
      mapState.startTX = mapState.x;
      mapState.startTY = mapState.y;
    } else if (e.touches.length === 2) {
      mapState.isDragging = false;
      mapState.pinchDist = getPinchDist(e.touches);
      mapState.pinchScale = mapState.scale;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && mapState.isDragging) {
      const dx = e.touches[0].clientX - mapState.startX;
      const dy = e.touches[0].clientY - mapState.startY;
      mapState.x = mapState.startTX + dx;
      mapState.y = mapState.startTY + dy;
      clampMap(container);
      applyMapTransform(mapEl);
    } else if (e.touches.length === 2) {
      const dist = getPinchDist(e.touches);
      const newScale = Math.max(0.5, Math.min(3, mapState.pinchScale * (dist / mapState.pinchDist)));
      mapState.scale = newScale;
      clampMap(container);
      applyMapTransform(mapEl);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    mapState.isDragging = false;
  }, { passive: true });

  // Mouse drag (for desktop testing)
  let mouseDown = false;
  container.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mapState.startX = e.clientX;
    mapState.startY = e.clientY;
    mapState.startTX = mapState.x;
    mapState.startTY = mapState.y;
    container.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    mapState.x = mapState.startTX + (e.clientX - mapState.startX);
    mapState.y = mapState.startTY + (e.clientY - mapState.startY);
    clampMap(container);
    applyMapTransform(mapEl);
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
    container.style.cursor = '';
  });

  // Wheel zoom (desktop)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    mapState.scale = Math.max(0.5, Math.min(3, mapState.scale * delta));
    clampMap(container);
    applyMapTransform(mapEl);
  }, { passive: false });
}

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampMap(container) {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const mw = mapState.imgW * mapState.scale;
  const mh = mapState.imgH * mapState.scale;

  if (mw <= cw) {
    mapState.x = (cw - mw) / 2;
  } else {
    mapState.x = Math.min(0, Math.max(cw - mw, mapState.x));
  }
  if (mh <= ch) {
    mapState.y = (ch - mh) / 2;
  } else {
    mapState.y = Math.min(0, Math.max(ch - mh, mapState.y));
  }
}

function applyMapTransform(mapEl) {
  mapEl.style.transform = `translate(${mapState.x}px, ${mapState.y}px) scale(${mapState.scale})`;
}

function setupMapSwitch(el) {
  const btn = el.querySelector('.map-switch');
  btn.addEventListener('click', () => {
    const current = gameState.get('currentMap');
    const next = current === 'buland' ? 'aeland' : 'buland';
    gameState.set('currentMap', next);
    loadMap(el, next);
  });
}

let selectedLocation = null;

function setupLocationPanel(el) {
  const panel = el.querySelector('.location-panel');
  const cancelBtn = panel.querySelector('.location-panel__btn--cancel');
  const travelBtn = panel.querySelector('.location-panel__btn--travel');

  cancelBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    selectedLocation = null;
  });

  travelBtn.addEventListener('click', () => {
    if (!selectedLocation) return;
    panel.classList.remove('open');
    travelTo(el, selectedLocation);
  });

  // Swipe down to close
  let startY = 0;
  panel.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (e.touches[0].clientY - startY > 50) {
      panel.classList.remove('open');
      selectedLocation = null;
    }
  }, { passive: true });
}

function travelTo(el, locId) {
  const loc = LOCATIONS[locId];
  if (!loc) return;

  const overlay = el.querySelector('.travel-overlay');
  overlay.querySelector('.travel-overlay__text').textContent = `Ferðast til ${loc.name}...`;
  overlay.classList.add('active');

  setTimeout(() => {
    gameState.set('currentLocation', locId);
    if (loc.map !== gameState.get('currentMap')) {
      gameState.set('currentMap', loc.map);
      loadMap(el, loc.map);
    }
    updatePlayerPosition(el);

    // Apply stat boosts
    if (loc.statBoost) {
      Object.entries(loc.statBoost).forEach(([stat, amount]) => {
        gameState.addStat(stat, Math.floor(amount * (0.5 + Math.random() * 0.5)));
      });
    }

    // Track visited
    const visited = gameState.get('visitedLocations');
    if (!visited.includes(locId)) {
      visited.push(locId);
      gameState.set('visitedLocations', visited);
    }

    updateHUD(el);
    gameState.save();

    setTimeout(() => overlay.classList.remove('active'), 400);
  }, 1200);
}

function loadMap(el, mapId) {
  const img = el.querySelector('.map-image img');
  const mapEl = el.querySelector('.map-image');
  const container = el.querySelector('.map-container');
  const teamData = TEAMS[mapId];

  const src = mapId === 'buland'
    ? 'assets/maps/buland-map.jpeg'
    : 'assets/maps/aeland-map.jpeg';

  img.onload = () => {
    mapState.imgW = img.naturalWidth;
    mapState.imgH = img.naturalHeight;

    // Fit map to container width with some extra
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const fitScale = Math.max(containerH / mapState.imgH, containerW / mapState.imgW);
    mapState.scale = fitScale * 1.1;

    // Center on current location
    const locId = gameState.get('currentLocation');
    const loc = LOCATIONS[locId];
    if (loc && loc.map === mapId) {
      const px = (loc.x / 100) * mapState.imgW * mapState.scale;
      const py = (loc.y / 100) * mapState.imgH * mapState.scale;
      mapState.x = containerW / 2 - px;
      mapState.y = containerH / 2 - py;
    } else {
      mapState.x = (containerW - mapState.imgW * mapState.scale) / 2;
      mapState.y = (containerH - mapState.imgH * mapState.scale) / 2;
    }

    clampMap(container);
    applyMapTransform(mapEl);
    renderPins(el, mapId);
    updatePlayerPosition(el);
  };

  img.src = src;

  // Update switch button
  const switchBtn = el.querySelector('.map-switch');
  const otherMap = mapId === 'buland' ? 'aeland' : 'buland';
  switchBtn.textContent = `🗺️ ${TEAMS[otherMap].name}`;
}

function renderPins(el, mapId) {
  // Remove old pins
  el.querySelectorAll('.location-pin').forEach(p => p.remove());

  const mapEl = el.querySelector('.map-image');
  const locs = Object.values(LOCATIONS).filter(l => l.map === mapId);
  const currentLocId = gameState.get('currentLocation');

  locs.forEach(loc => {
    const pin = document.createElement('div');
    pin.className = `location-pin ${loc.id === currentLocId ? 'current' : ''}`;
    pin.style.left = `${loc.x}%`;
    pin.style.top = `${loc.y}%`;

    pin.innerHTML = `
      <div class="location-pin__icon">
        <div class="location-pin__marker" style="background:${loc.color}">
          <span>${loc.icon}</span>
        </div>
      </div>
      <div class="location-pin__label">${loc.name}</div>
    `;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      openLocationPanel(el, loc);
    });

    mapEl.appendChild(pin);
  });
}

function openLocationPanel(el, loc) {
  selectedLocation = loc.id;
  const panel = el.querySelector('.location-panel');
  const currentLoc = gameState.get('currentLocation');
  const isHere = loc.id === currentLoc;

  panel.querySelector('.location-panel__name').textContent =
    `${loc.icon} ${loc.name}${loc.special ? ' ⭐' : ''}`;
  panel.querySelector('.location-panel__desc').textContent = loc.desc;

  const travelBtn = panel.querySelector('.location-panel__btn--travel');
  if (isHere) {
    travelBtn.textContent = '📍 Hér ertu';
    travelBtn.style.opacity = '0.5';
    travelBtn.style.pointerEvents = 'none';
  } else {
    travelBtn.textContent = '🚶 Ferðast';
    travelBtn.style.opacity = '1';
    travelBtn.style.pointerEvents = 'all';

    // Color travel button to team
    const team = gameState.get('team');
    if (team === 'buland') {
      travelBtn.style.background = 'linear-gradient(135deg, var(--buland-primary), var(--buland-secondary))';
    } else {
      travelBtn.style.background = 'linear-gradient(135deg, var(--aeland-primary), var(--aeland-secondary))';
    }
  }

  panel.classList.add('open');
}

function updatePlayerPosition(el) {
  const locId = gameState.get('currentLocation');
  const loc = LOCATIONS[locId];
  const marker = el.querySelector('.player-marker');
  const currentMap = gameState.get('currentMap');

  if (!loc || loc.map !== currentMap) {
    marker.style.display = 'none';
    return;
  }

  marker.style.display = 'block';
  marker.style.left = `${loc.x}%`;
  marker.style.top = `${loc.y}%`;

  const team = gameState.get('team');
  const dot = marker.querySelector('.player-marker__dot');
  dot.style.background = TEAMS[team].colors.primary;

  // Move marker into map-image so it transforms with it
  const mapImage = el.querySelector('.map-image');
  if (marker.parentElement !== mapImage) {
    mapImage.appendChild(marker);
  }
}

function updateHUD(el) {
  const char = CHARACTERS.find(c => c.id === gameState.get('character'));
  const team = gameState.get('team');
  const teamData = TEAMS[team];

  if (char) {
    el.querySelector('.hud__avatar').textContent = char.emoji;
    el.querySelector('.hud__avatar').style.background = char.avatar_bg;
    el.querySelector('.hud__name').textContent = char.name;
    el.querySelector('.hud__team').textContent = teamData.name;
  }

  el.querySelector('.hud__day').textContent = `Dagur ${gameState.get('day')}`;

  const stats = gameState.getStats();
  STAT_META.forEach(s => {
    const bar = el.querySelector(`.stat-bar[data-stat="${s.key}"]`);
    if (!bar) return;
    const val = stats[s.key] || 0;
    bar.querySelector('.stat-bar__fill').style.width = `${val}%`;
    bar.querySelector('.stat-bar__value').textContent = `${val}%`;
  });
}

function onEnter() {
  const el = this.el;
  const map = gameState.get('currentMap') || gameState.get('team');
  loadMap(el, map);
  updateHUD(el);

  // Listen for stat changes
  gameState.on('stats', () => updateHUD(el));
}

export const MapView = { create, onEnter };
