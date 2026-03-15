import { state, loadState, saveState } from './state.js';
import { initEvents } from './events.js';
import { renderCanvas, preloadSocialIcons } from './render.js';
import { loadGoogleFont } from './fonts.js';
import { preloadProfileImage, preloadBgImage } from './assets.js';

// Entry point
document.addEventListener('DOMContentLoaded', async () => {
  // Load state from localStorage
  loadState();

  // Load Google Fonts
  loadGoogleFont(state.fonts.heading);
  loadGoogleFont(state.fonts.body);

  // Preload social icons from Simple Icons CDN
  try {
    await preloadSocialIcons();
  } catch (err) {
    console.error('Failed to preload social icons:', err);
  }

  // Preload images if they exist
  if (state.assets.profilePhoto) {
    try {
      await preloadProfileImage(state.assets.profilePhoto);
    } catch (err) {
      console.error('Failed to preload profile image:', err);
    }
  }
  if (state.assets.bgImage) {
    try {
      await preloadBgImage(state.assets.bgImage);
    } catch (err) {
      console.error('Failed to preload background image:', err);
    }
  }

  // Initialize event handlers
  initEvents();

  // Initial canvas render (after images are loaded)
  renderCanvas();
});

// Auto-save on state changes
export function triggerSave() {
  saveState();
  renderCanvas();
}
