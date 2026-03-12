import { state } from './state.js';
import { colorWithOpacity } from './utils.js';

const CANVAS_WIDTH = 800;
const SCALE = 1;

// Main render function
export function renderCanvas() {
  const canvas = document.getElementById('resumeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Calculate dynamic height based on content
  const contentHeight = calculateContentHeight();
  canvas.width = CANVAS_WIDTH * SCALE;
  canvas.height = contentHeight * SCALE;

  // Set canvas display size (CSS pixels)
  canvas.style.width = `${CANVAS_WIDTH}px`;
  canvas.style.height = `${contentHeight}px`;

  // Scale context for high DPI
  ctx.scale(SCALE, SCALE);

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, contentHeight);

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, contentHeight);

  // Calculate column dimensions
  const columnWidthPx = (state.layout.columnWidth / 100) * CANVAS_WIDTH;
  const columnX = state.layout.columnSide === 'left' ? 0 : CANVAS_WIDTH - columnWidthPx;
  const mainX = state.layout.columnSide === 'left' ? columnWidthPx : 0;
  const mainWidth = CANVAS_WIDTH - columnWidthPx;

  // Draw column background
  ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
  ctx.fillRect(columnX, 0, columnWidthPx, contentHeight);

  // Draw column content
  drawColumnContent(ctx, columnX, columnWidthPx);

  // Draw main content
  drawMainContent(ctx, mainX, mainWidth);
}

// Calculate total content height
function calculateContentHeight() {
  // Base height + dynamic content
  let height = 100; // Top margin

  // Main area height
  height += 60; // Name + title
  height += state.summary ? 80 : 0;
  height += 40; // Experience header
  height += state.experience.length * 120;
  height += 40; // Tech skills header
  height += Math.ceil(state.skills.length / 2) * 30;

  // Column content might be taller
  let columnHeight = 100; // Top margin
  columnHeight += state.assets.profilePhoto ? 120 : 0;
  columnHeight += 60; // Location
  columnHeight += 40; // Skills header
  columnHeight += state.skills.length * 30;
  columnHeight += 40; // Education header
  columnHeight += state.education.length * 80;
  columnHeight += 40; // Languages header
  columnHeight += state.languages.length * 25;
  if (state.gaming.enabled && (state.gaming.psnStats || state.gaming.steamStats)) {
    columnHeight += 40; // Gaming header
    columnHeight += state.gaming.psnStats ? 80 : 0;
    columnHeight += state.gaming.steamStats ? 60 : 0;
  }

  return Math.max(height, columnHeight) + 60; // Bottom padding
}

// Draw column content (left or right)
function drawColumnContent(ctx, x, width) {
  const padding = 20;
  let y = 40;

  // Profile photo
  if (state.assets.profilePhoto) {
    const img = new Image();
    img.src = state.assets.profilePhoto;
    const size = 100;
    const photoX = x + (width - size) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, photoX, y, size, size);
    ctx.restore();
    y += size + 20;
  }

  // Location
  if (state.location) {
    ctx.font = `14px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(state.location, x + width/2, y);
    y += 40;
  }

  // Skills header
  y += 10;
  ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('SKILLS', x + padding, y);
  y += 25;

  // Skills with hearts
  state.skills.forEach(skill => {
    ctx.font = `14px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(skill.name, x + padding, y);

    // Draw hearts
    const heartsX = x + padding;
    const heartsY = y + 8;
    for (let i = 0; i < 5; i++) {
      const heartX = heartsX + i * 18;
      ctx.fillStyle = i < skill.hearts ? '#ef4444' : '#666666';
      drawHeart(ctx, heartX, heartsY, 12);
    }
    y += 30;
  });

  // Education
  if (state.education.length > 0) {
    y += 10;
    ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('EDUCATION', x + padding, y);
    y += 25;

    state.education.forEach(edu => {
      ctx.font = `bold 13px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#ffffff';
      wrapText(ctx, edu.school, x + padding, y, width - padding * 2, 18);
      y += 18;

      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#dddddd';
      wrapText(ctx, edu.degree, x + padding, y, width - padding * 2, 16);
      y += 16;

      ctx.font = `11px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#cccccc';
      ctx.fillText(edu.dates, x + padding, y);
      y += 14;

      if (edu.location) {
        ctx.fillText(edu.location, x + padding, y);
        y += 14;
      }
      y += 18;
    });
  }

  // Languages
  if (state.languages.length > 0) {
    y += 10;
    ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LANGUAGES', x + padding, y);
    y += 25;

    state.languages.forEach(lang => {
      ctx.font = `13px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${lang.name} — ${lang.level}`, x + padding, y);
      y += 25;
    });
  }

  // Gaming stats
  if (state.gaming.enabled) {
    if (state.gaming.psnStats) {
      y += 10;
      ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PSN', x + padding, y);
      y += 25;

      const stats = state.gaming.psnStats;
      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#dddddd';
      ctx.fillText(`Level ${stats.level} • ${stats.games} games`, x + padding, y);
      y += 18;
      ctx.fillText(`🥇 ${stats.trophies?.platinum} 🥈 ${stats.trophies?.gold} 🥉 ${stats.trophies?.silver} 🏅 ${stats.trophies?.bronze}`, x + padding, y);
      y += 30;
    }

    if (state.gaming.steamStats) {
      y += 10;
      ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('STEAM', x + padding, y);
      y += 25;

      const stats = state.gaming.steamStats;
      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#dddddd';
      ctx.fillText(`${stats.games} games`, x + padding, y);
      y += 18;
      if (stats.playtime) {
        ctx.fillText(`${Math.round(stats.playtime)} hours played`, x + padding, y);
        y += 18;
      }
    }
  }
}

// Draw main content area
function drawMainContent(ctx, x, width) {
  const padding = 30;
  let y = 60;

  // Name
  ctx.font = `bold 32px "${state.fonts.heading}", sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText(state.name, x + padding, y);
  y += 40;

  // Title
  ctx.font = `20px "${state.fonts.body}", sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.fillText(state.title, x + padding, y);
  y += 30;

  // Contact info
  const contacts = [state.email, state.phone, state.linkedin, state.github, state.website].filter(Boolean);
  if (contacts.length > 0) {
    ctx.font = `11px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText(contacts.join(' • '), x + padding, y);
    y += 30;
  }

  // Summary
  if (state.summary) {
    ctx.font = `13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#444444';
    wrapText(ctx, state.summary, x + padding, y, width - padding * 2, 20);
    y += Math.ceil(state.summary.length / 80) * 20 + 20;
  }

  // Experience
  if (state.experience.length > 0) {
    y += 10;
    ctx.font = `bold 18px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText('EXPERIENCE', x + padding, y);
    y += 30;

    state.experience.forEach(exp => {
      ctx.font = `bold 15px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.fillText(exp.company, x + padding, y);
      y += 22;

      ctx.font = `14px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#333333';
      ctx.fillText(exp.role, x + padding, y);
      y += 20;

      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.fillText(`${exp.dates} • ${exp.location}`, x + padding, y);
      y += 20;

      if (exp.description) {
        ctx.font = `12px "${state.fonts.body}", sans-serif`;
        ctx.fillStyle = '#555555';
        wrapText(ctx, exp.description, x + padding, y, width - padding * 2, 18);
        y += Math.ceil(exp.description.length / 100) * 18 + 10;
      }
      y += 20;
    });
  }
}

// Draw heart shape
function drawHeart(ctx, x, y, size) {
  ctx.save();
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.2, x, y + size);
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Wrap text helper
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, lineY);
      line = words[n] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}
