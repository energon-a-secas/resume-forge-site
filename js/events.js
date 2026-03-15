import { state } from './state.js';
import { triggerSave } from './app.js';
import {
  renderPersonalInputs,
  renderExperienceList,
  renderSkillsList,
  renderEducationList,
  renderLanguagesList,
  addExperience,
  addSkill,
  addEducation,
  addLanguage,
} from './editor.js';
import { updateLayoutControls } from './layout.js';
import { uploadImage, showImagePreview, clearAllAssets, preloadProfileImage, preloadBgImage } from './assets.js';
import { fetchPSNStats, fetchSteamStats, renderPSNStats, renderSteamStats } from './gaming.js';
import { exportPDF } from './export.js';
import { loadGoogleFont } from './fonts.js';

// Initialize all event handlers
export function initEvents() {
  // Tab switching
  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Personal inputs
  document.getElementById('inputName').addEventListener('input', e => {
    state.name = e.target.value;
    triggerSave();
  });
  document.getElementById('inputTitle').addEventListener('input', e => {
    state.title = e.target.value;
    triggerSave();
  });
  document.getElementById('inputLocation').addEventListener('input', e => {
    state.location = e.target.value;
    triggerSave();
  });
  document.getElementById('inputEmail').addEventListener('input', e => {
    state.email = e.target.value;
    triggerSave();
  });
  document.getElementById('inputPhone').addEventListener('input', e => {
    state.phone = e.target.value;
    triggerSave();
  });
  document.getElementById('inputLinkedin').addEventListener('input', e => {
    state.linkedin = e.target.value;
    triggerSave();
  });
  document.getElementById('inputGithub').addEventListener('input', e => {
    state.github = e.target.value;
    triggerSave();
  });
  document.getElementById('inputWebsite').addEventListener('input', e => {
    state.website = e.target.value;
    triggerSave();
  });
  document.getElementById('inputLinktree').addEventListener('input', e => {
    state.linktree = e.target.value;
    triggerSave();
  });
  document.getElementById('inputTwitter').addEventListener('input', e => {
    state.twitter = e.target.value;
    triggerSave();
  });
  document.getElementById('inputSummary').addEventListener('input', e => {
    state.summary = e.target.value;
    triggerSave();
  });

  // Add buttons
  document.getElementById('addExperienceBtn').addEventListener('click', addExperience);
  document.getElementById('addSkillBtn').addEventListener('click', addSkill);
  document.getElementById('addEducationBtn').addEventListener('click', addEducation);
  document.getElementById('addLanguageBtn').addEventListener('click', addLanguage);

  // Gaming toggle
  document.getElementById('gamingEnabled').addEventListener('change', e => {
    state.gaming.enabled = e.target.checked;
    document.getElementById('gamingFields').classList.toggle('hidden', !e.target.checked);
    triggerSave();
  });

  // PSN username
  document.getElementById('inputPsnUsername').addEventListener('input', e => {
    state.gaming.psnUsername = e.target.value;
    triggerSave();
  });

  // Fetch PSN stats
  document.getElementById('fetchPsnBtn').addEventListener('click', async () => {
    const stats = await fetchPSNStats(state.gaming.psnUsername);
    if (stats) {
      state.gaming.psnStats = stats;
      renderPSNStats(stats);
      triggerSave();
    }
  });

  // Steam ID
  document.getElementById('inputSteamId').addEventListener('input', e => {
    state.gaming.steamId = e.target.value;
    triggerSave();
  });

  // Fetch Steam stats
  document.getElementById('fetchSteamBtn').addEventListener('click', async () => {
    const stats = await fetchSteamStats(state.gaming.steamId);
    if (stats) {
      state.gaming.steamStats = stats;
      renderSteamStats(stats);
      triggerSave();
    }
  });

  // Layout template
  document.querySelectorAll('input[name="layoutTemplate"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.layout.template = e.target.value;
      // Hide column controls for big-header template
      const columnGroup = document.getElementById('columnPositionGroup');
      if (columnGroup) {
        columnGroup.style.display = e.target.value === 'big-header' ? 'none' : 'block';
      }
      triggerSave();
    });
  });

  // Spacing
  document.querySelectorAll('input[name="spacing"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.layout.spacing = e.target.value;
      triggerSave();
    });
  });

  // Layout controls
  document.querySelectorAll('input[name="columnSide"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.layout.columnSide = e.target.value;
      triggerSave();
    });
  });

  document.getElementById('inputColumnWidth').addEventListener('input', e => {
    state.layout.columnWidth = parseInt(e.target.value, 10);
    document.getElementById('columnWidthValue').textContent = state.layout.columnWidth;
    triggerSave();
  });

  document.getElementById('inputColumnColor').addEventListener('input', e => {
    state.layout.columnColor = e.target.value;
    triggerSave();
  });

  document.getElementById('inputColumnOpacity').addEventListener('input', e => {
    state.layout.columnOpacity = parseInt(e.target.value, 10);
    document.getElementById('columnOpacityValue').textContent = state.layout.columnOpacity;
    triggerSave();
  });

  document.getElementById('inputBgDim').addEventListener('input', e => {
    state.layout.bgDim = parseInt(e.target.value, 10);
    document.getElementById('bgDimValue').textContent = state.layout.bgDim;
    triggerSave();
  });

  // Font selects
  document.getElementById('inputFontHeading').addEventListener('change', e => {
    state.fonts.heading = e.target.value;
    loadGoogleFont(state.fonts.heading);
    triggerSave();
  });

  document.getElementById('inputFontBody').addEventListener('change', e => {
    state.fonts.body = e.target.value;
    loadGoogleFont(state.fonts.body);
    triggerSave();
  });

  // Asset uploads
  document.getElementById('inputProfilePhoto').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await uploadImage(file);
        state.assets.profilePhoto = base64;
        showImagePreview('profilePhotoPreview', base64);
        // Wait for image to preload before rendering
        await preloadProfileImage(base64);
        // Now render with the loaded image
        triggerSave();
      } catch (err) {
        console.error('Failed to upload profile photo:', err);
      }
    }
  });

  // Photo shape
  document.querySelectorAll('input[name="photoShape"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.assets.photoShape = e.target.value;
      triggerSave();
    });
  });

  // Photo border toggle
  document.getElementById('photoBorderToggle').addEventListener('change', e => {
    state.assets.photoBorder = e.target.checked;
    document.getElementById('borderOptions').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('borderWidthGroup').style.display = e.target.checked ? 'block' : 'none';
    triggerSave();
  });

  // Border color
  document.getElementById('inputBorderColor').addEventListener('input', e => {
    state.assets.borderColor = e.target.value;
    triggerSave();
  });

  // Border width
  document.getElementById('inputBorderWidth').addEventListener('input', e => {
    state.assets.borderWidth = parseInt(e.target.value, 10);
    document.getElementById('borderWidthValue').textContent = state.assets.borderWidth;
    triggerSave();
  });

  document.getElementById('inputBgImage').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await uploadImage(file);
        state.assets.bgImage = base64;
        showImagePreview('bgImagePreview', base64);
        await preloadBgImage(base64);
        triggerSave();
      } catch (err) {
        console.error('Failed to upload background image:', err);
      }
    }
  });

  document.getElementById('clearAssetsBtn').addEventListener('click', () => {
    clearAllAssets(state);
    triggerSave();
  });

  // Export PDF
  document.getElementById('exportBtn').addEventListener('click', exportPDF);

  // Initial render
  renderPersonalInputs();
  renderExperienceList();
  renderSkillsList();
  renderEducationList();
  renderLanguagesList();
  updateLayoutControls(state);

  // Restore gaming UI state
  document.getElementById('gamingEnabled').checked = state.gaming.enabled;
  document.getElementById('gamingFields').classList.toggle('hidden', !state.gaming.enabled);
  document.getElementById('inputPsnUsername').value = state.gaming.psnUsername;
  document.getElementById('inputSteamId').value = state.gaming.steamId;
  if (state.gaming.psnStats) renderPSNStats(state.gaming.psnStats);
  if (state.gaming.steamStats) renderSteamStats(state.gaming.steamStats);

  // Restore asset previews and preload images
  if (state.assets.profilePhoto) {
    showImagePreview('profilePhotoPreview', state.assets.profilePhoto);
    preloadProfileImage(state.assets.profilePhoto);
  }
  if (state.assets.bgImage) {
    showImagePreview('bgImagePreview', state.assets.bgImage);
    preloadBgImage(state.assets.bgImage);
  }

  // Restore photo frame controls
  document.querySelectorAll('input[name="photoShape"]').forEach(radio => {
    radio.checked = radio.value === state.assets.photoShape;
  });
  document.getElementById('photoBorderToggle').checked = state.assets.photoBorder;
  document.getElementById('inputBorderColor').value = state.assets.borderColor;
  document.getElementById('inputBorderWidth').value = state.assets.borderWidth;
  document.getElementById('borderWidthValue').textContent = state.assets.borderWidth;
  document.getElementById('borderOptions').style.display = state.assets.photoBorder ? 'block' : 'none';
  document.getElementById('borderWidthGroup').style.display = state.assets.photoBorder ? 'block' : 'none';
  if (state.assets.bgImage) showImagePreview('bgImagePreview', state.assets.bgImage);

  // Restore background dim
  document.getElementById('inputBgDim').value = state.layout.bgDim || 0;
  document.getElementById('bgDimValue').textContent = state.layout.bgDim || 0;

  // Restore layout template
  document.querySelectorAll('input[name="layoutTemplate"]').forEach(radio => {
    radio.checked = radio.value === (state.layout.template || 'standard');
  });

  // Restore spacing
  document.querySelectorAll('input[name="spacing"]').forEach(radio => {
    radio.checked = radio.value === (state.layout.spacing || 'tight');
  });

  // Hide column controls if big-header template
  const columnGroup = document.getElementById('columnPositionGroup');
  if (columnGroup && state.layout.template === 'big-header') {
    columnGroup.style.display = 'none';
  }
}

// Switch active tab
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update sections
  const sections = {
    personal: 'personalSection',
    experience: 'experienceSection',
    skills: 'skillsSection',
    education: 'educationSection',
    certifications: 'certificationsSection',
    gaming: 'gamingSection',
    sidebar: 'sidebarSection',
    layout: 'layoutSection',
    assets: 'assetsSection',
  };

  Object.entries(sections).forEach(([key, sectionId]) => {
    const section = document.getElementById(sectionId);
    section.classList.toggle('hidden', key !== tabName);
  });
}
