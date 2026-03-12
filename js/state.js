import { defaultState } from './data.js';

// Shared mutable state
export const state = {
  // Personal
  name: '',
  title: '',
  location: '',
  email: '',
  phone: '',
  linkedin: '',
  github: '',
  website: '',
  summary: '',

  // Experience
  experience: [],

  // Skills (heart-rated)
  skills: [],

  // Education
  education: [],

  // Languages
  languages: [],

  // Gaming
  gaming: {
    enabled: false,
    psnUsername: '',
    psnStats: null,
    steamId: '',
    steamStats: null,
  },

  // Layout
  layout: {
    columnSide: 'left',
    columnWidth: 30,
    columnColor: '#2d5016',
    columnOpacity: 100,
  },

  // Assets
  assets: {
    profilePhoto: '',
    bgImage: '',
  },

  // Typography
  fonts: {
    heading: 'Permanent Marker',
    body: 'Inter',
  },
};

const STORAGE_KEY = 'resume-forge-v1';

// Load from localStorage
export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(state, parsed);
    } else {
      // Use default state
      Object.assign(state, defaultState());
    }
  } catch (err) {
    console.error('Failed to load state:', err);
    Object.assign(state, defaultState());
  }
}

// Save to localStorage
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state:', err);
    // Check if quota exceeded
    if (err.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please remove some images.');
    }
  }
}

// Clear state
export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, defaultState());
}
