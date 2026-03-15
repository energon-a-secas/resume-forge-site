import { showToast } from './utils.js';

// Upload image and convert to base64
export function uploadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Check file size (max 2MB per image)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image too large. Please use images under 2MB.');
      reject(new Error('File too large'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // base64
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Preload profile image for canvas rendering
export function preloadProfileImage(base64) {
  if (!base64) {
    window._loadedProfileImage = null;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      window._loadedProfileImage = img;
      console.log('✓ Image preloaded:', img.width, 'x', img.height);
      resolve(img);
    };

    img.onerror = (err) => {
      console.error('✗ Image load error:', err);
      showToast('Failed to load image');
      window._loadedProfileImage = null;
      reject(new Error('Image load failed'));
    };

    img.src = base64;
  });
}

// Show image preview
export function showImagePreview(containerId, base64) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  if (base64) {
    const img = document.createElement('img');
    img.src = base64;
    container.appendChild(img);
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

// Preload background image for canvas rendering
export function preloadBgImage(base64) {
  if (!base64) {
    window._loadedBgImage = null;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      window._loadedBgImage = img;
      console.log('✓ BG image preloaded:', img.width, 'x', img.height);
      resolve(img);
    };

    img.onerror = (err) => {
      console.error('✗ BG image load error:', err);
      showToast('Failed to load background image');
      window._loadedBgImage = null;
      reject(new Error('BG image load failed'));
    };

    img.src = base64;
  });
}

// Clear all assets
export function clearAllAssets(state) {
  state.assets.profilePhoto = '';
  state.assets.bgImage = '';
  window._loadedProfileImage = null;
  window._loadedBgImage = null;
  showImagePreview('profilePhotoPreview', '');
  showImagePreview('bgImagePreview', '');
  showToast('All assets cleared');
}
