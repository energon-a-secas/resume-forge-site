// Raw localStorage throws in private browsing, where the object exists but
// every access raises. These wrappers return a fallback instead. Storage
// keys and formats are unchanged, so existing saved data still loads.
import { safeRemove } from './neorgon-persist.js';

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
  linktree: '',
  twitter: '',
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
    bgDim: 0, // 0-100, black overlay opacity over background image
    template: 'standard', // 'standard' | 'big-header'
    spacing: 'normal', // 'tight' | 'normal' | 'relaxed'
  },

  // Sidebar sections (configurable order and visibility)
  sidebarSections: [
    { id: 'skills', enabled: true, title: 'SKILLS' },
    { id: 'education', enabled: true, title: 'EDUCATION' },
    { id: 'languages', enabled: true, title: 'LANGUAGES' },
    { id: 'certifications', enabled: false, title: 'CERTIFICATIONS' },
    { id: 'custom1', enabled: false, title: 'CUSTOM' },
  ],

  // Certifications
  certifications: [],

  // Projects (optional, for tech resumes)
  projects: [],

  // Awards & Achievements
  awards: [],

  // Assets
  assets: {
    profilePhoto: '',
    bgImage: '',
    photoShape: 'circle', // 'circle' | 'square' | 'rounded'
    photoBorder: true,
    borderColor: '#8b5cf6',
    borderWidth: 4,
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
  safeRemove(STORAGE_KEY);
  Object.assign(state, defaultState());
}
