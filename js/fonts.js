// Load Google Font dynamically
export function loadGoogleFont(fontName) {
  if (!fontName || fontName === 'Avenir Next') return; // System font

  const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
  if (document.getElementById(linkId)) return; // Already loaded

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

// Wait for font to be ready
export function waitForFont(fontName, timeout = 3000) {
  if (!document.fonts) return Promise.resolve();

  return Promise.race([
    document.fonts.ready,
    new Promise(resolve => setTimeout(resolve, timeout)),
  ]);
}
