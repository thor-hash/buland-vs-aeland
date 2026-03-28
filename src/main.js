import { initScenes, sceneManager } from './engine/scenes.js';
import { gameState } from './engine/state.js';
import { MainMenu } from './scenes/MainMenu.js';
import { CharSelect } from './scenes/CharSelect.js';
import { MapView } from './scenes/MapView.js';

function init() {
  const root = document.getElementById('game-root');
  initScenes(root);

  sceneManager.register('mainMenu', MainMenu);
  sceneManager.register('charSelect', CharSelect);
  sceneManager.register('mapView', MapView);

  // Check for saved game
  if (gameState.load() && gameState.get('character')) {
    sceneManager.go('mapView');
  } else {
    gameState.reset();
    sceneManager.go('mainMenu');
  }
}

// Prevent zoom on double-tap
document.addEventListener('dblclick', (e) => e.preventDefault());

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
