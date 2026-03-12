import { state, loadState, saveState } from './state.js';
import { initEvents } from './events.js';
import { renderCanvas } from './render.js';
import { loadGoogleFont } from './fonts.js';

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  // Load state from localStorage
  loadState();

  // Load Google Fonts
  loadGoogleFont(state.fonts.heading);
  loadGoogleFont(state.fonts.body);

  // Initialize event handlers
  initEvents();

  // Initial canvas render
  renderCanvas();
});

// Auto-save on state changes
export function triggerSave() {
  saveState();
  renderCanvas();
}
