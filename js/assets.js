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

// Clear all assets
export function clearAllAssets(state) {
  state.assets.profilePhoto = '';
  state.assets.bgImage = '';
  showImagePreview('profilePhotoPreview', '');
  showImagePreview('bgImagePreview', '');
  showToast('All assets cleared');
}
