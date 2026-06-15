import { state } from './state.js';
import { colorWithOpacity } from './utils.js';

// US Letter dimensions: 8.5" x 11" at 96 DPI = 816px x 1056px
// We'll use 850px x 1100px for nicer numbers
const CANVAS_WIDTH = 850;
const CANVAS_HEIGHT = 1100;
const SCALE = 1;

// Spacing presets
const SPACING_PRESETS = {
  tight: {
    section: 15,
    item: 12,
    paragraph: 8,
    header: 18,
  },
  normal: {
    section: 20,
    item: 15,
    paragraph: 10,
    header: 25,
  },
  relaxed: {
    section: 30,
    item: 20,
    paragraph: 15,
    header: 35,
  },
};

// Main render function
export function renderCanvas() {
  const canvas = document.getElementById('resumeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Use standard US Letter dimensions
  canvas.width = CANVAS_WIDTH * SCALE;
  canvas.height = CANVAS_HEIGHT * SCALE;

  // Set canvas display size (CSS pixels)
  canvas.style.width = `${CANVAS_WIDTH}px`;
  canvas.style.height = `${CANVAS_HEIGHT}px`;

  // Scale context for high DPI
  ctx.scale(SCALE, SCALE);

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Get spacing preset
  const spacing = SPACING_PRESETS[state.layout.spacing] || SPACING_PRESETS.normal;

  // Render based on template
  if (state.layout.template === 'big-header') {
    renderBigHeaderTemplate(ctx, spacing);
  } else {
    renderStandardTemplate(ctx, spacing);
  }
}

// Standard template (sidebar + main)
function renderStandardTemplate(ctx, spacing) {
  // Calculate column dimensions
  const columnWidthPx = (state.layout.columnWidth / 100) * CANVAS_WIDTH;
  const columnX = state.layout.columnSide === 'left' ? 0 : CANVAS_WIDTH - columnWidthPx;
  const mainX = state.layout.columnSide === 'left' ? columnWidthPx : 0;
  const mainWidth = CANVAS_WIDTH - columnWidthPx;

  // Draw column background
  if (state.assets.bgImage && window._loadedBgImage) {
    // Draw background image in column
    ctx.save();
    // Create clipping region for column
    ctx.beginPath();
    ctx.rect(columnX, 0, columnWidthPx, CANVAS_HEIGHT);
    ctx.clip();

    // Draw image to cover column
    const img = window._loadedBgImage;
    const imgAspect = img.width / img.height;
    const columnAspect = columnWidthPx / CANVAS_HEIGHT;

    let drawWidth, drawHeight, drawX, drawY;
    if (imgAspect > columnAspect) {
      // Image is wider, fit to height
      drawHeight = CANVAS_HEIGHT;
      drawWidth = CANVAS_HEIGHT * imgAspect;
      drawX = columnX - (drawWidth - columnWidthPx) / 2;
      drawY = 0;
    } else {
      // Image is taller, fit to width
      drawWidth = columnWidthPx;
      drawHeight = columnWidthPx / imgAspect;
      drawX = columnX;
      drawY = -(drawHeight - CANVAS_HEIGHT) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Apply black dim overlay if enabled
    if (state.layout.bgDim > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${state.layout.bgDim / 100})`;
      ctx.fillRect(columnX, 0, columnWidthPx, CANVAS_HEIGHT);
    }

    // Apply color overlay with opacity
    ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
    ctx.fillRect(columnX, 0, columnWidthPx, CANVAS_HEIGHT);

    ctx.restore();
  } else {
    // No background image, use solid color
    ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
    ctx.fillRect(columnX, 0, columnWidthPx, CANVAS_HEIGHT);

    // Try to load background image if it exists but isn't loaded yet
    if (state.assets.bgImage && !window._loadedBgImage) {
      const img = new Image();
      img.onload = () => {
        window._loadedBgImage = img;
        renderCanvas(); // Re-render when image loads
      };
      img.src = state.assets.bgImage;
    }
  }

  // Draw column content
  drawColumnContent(ctx, columnX, columnWidthPx, spacing);

  // Draw main content
  drawMainContent(ctx, mainX, mainWidth, spacing);
}

// Big header template (full-width header + content below)
function renderBigHeaderTemplate(ctx, spacing) {
  const padding = 40;
  let y = 60;
  const headerHeight = 220;

  // Big header section with background image support
  if (state.assets.bgImage && window._loadedBgImage) {
    const img = window._loadedBgImage;
    if (img.complete && img.width) {
      ctx.save();

      // Clip to header area
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS_WIDTH, headerHeight);
      ctx.clip();

      // Calculate aspect ratio to cover header area
      const imgAspect = img.width / img.height;
      const headerAspect = CANVAS_WIDTH / headerHeight;

      let drawWidth, drawHeight, drawX, drawY;
      if (imgAspect > headerAspect) {
        // Image is wider, fit to height
        drawHeight = headerHeight;
        drawWidth = headerHeight * imgAspect;
        drawX = -(drawWidth - CANVAS_WIDTH) / 2;
        drawY = 0;
      } else {
        // Image is taller, fit to width
        drawWidth = CANVAS_WIDTH;
        drawHeight = CANVAS_WIDTH / imgAspect;
        drawX = 0;
        drawY = -(drawHeight - headerHeight) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Apply black dim overlay if enabled
      if (state.layout.bgDim > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${state.layout.bgDim / 100})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, headerHeight);
      }

      // Apply color overlay with opacity
      ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
      ctx.fillRect(0, 0, CANVAS_WIDTH, headerHeight);

      ctx.restore();
    } else {
      // No image loaded yet, use solid color
      ctx.save();
      ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
      ctx.fillRect(0, 0, CANVAS_WIDTH, headerHeight);
      ctx.restore();
    }
  } else {
    // No background image, use solid color
    ctx.save();
    ctx.fillStyle = colorWithOpacity(state.layout.columnColor, state.layout.columnOpacity);
    ctx.fillRect(0, 0, CANVAS_WIDTH, headerHeight);
    ctx.restore();

    // Try to load background image if it exists but isn't loaded yet
    if (state.assets.bgImage && !window._loadedBgImage) {
      const img = new Image();
      img.onload = () => {
        window._loadedBgImage = img;
        renderCanvas(); // Re-render when image loads
      };
      img.src = state.assets.bgImage;
    }
  }

  // Profile photo (centered in header) with proper aspect ratio handling
  if (state.assets.profilePhoto && window._loadedProfileImage) {
    const img = window._loadedProfileImage;
    if (img.complete && img.width) {
      const size = 120;
      const photoX = CANVAS_WIDTH / 2 - size / 2;
      const photoY = 40;

      ctx.save();

      // Apply clipping path based on shape
      if (state.assets.photoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(photoX + size/2, photoY + size/2, size/2, 0, Math.PI * 2);
        ctx.clip();
      } else if (state.assets.photoShape === 'rounded') {
        const radius = 15;
        ctx.beginPath();
        ctx.moveTo(photoX + radius, photoY);
        ctx.lineTo(photoX + size - radius, photoY);
        ctx.arcTo(photoX + size, photoY, photoX + size, photoY + radius, radius);
        ctx.lineTo(photoX + size, photoY + size - radius);
        ctx.arcTo(photoX + size, photoY + size, photoX + size - radius, photoY + size, radius);
        ctx.lineTo(photoX + radius, photoY + size);
        ctx.arcTo(photoX, photoY + size, photoX, photoY + size - radius, radius);
        ctx.lineTo(photoX, photoY + radius);
        ctx.arcTo(photoX, photoY, photoX + radius, photoY, radius);
        ctx.closePath();
        ctx.clip();
      }
      // Square: no clipping needed

      // Calculate aspect ratio to cover the square photo area
      const imgAspect = img.width / img.height;
      let srcX, srcY, srcSize;

      if (imgAspect > 1) {
        // Image is wider, crop sides
        srcSize = img.height;
        srcX = (img.width - img.height) / 2;
        srcY = 0;
      } else {
        // Image is taller, crop top/bottom
        srcSize = img.width;
        srcX = 0;
        srcY = (img.height - img.width) / 2;
      }

      // Draw cropped square image
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, photoX, photoY, size, size);
      ctx.restore();

      // Draw border if enabled
      if (state.assets.photoBorder) {
        ctx.save();
        ctx.strokeStyle = state.assets.borderColor || '#8b5cf6';
        ctx.lineWidth = state.assets.borderWidth || 4;

        if (state.assets.photoShape === 'circle') {
          ctx.beginPath();
          ctx.arc(photoX + size/2, photoY + size/2, size/2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (state.assets.photoShape === 'rounded') {
          const radius = 15;
          ctx.beginPath();
          ctx.moveTo(photoX + radius, photoY);
          ctx.lineTo(photoX + size - radius, photoY);
          ctx.arcTo(photoX + size, photoY, photoX + size, photoY + radius, radius);
          ctx.lineTo(photoX + size, photoY + size - radius);
          ctx.arcTo(photoX + size, photoY + size, photoX + size - radius, photoY + size, radius);
          ctx.lineTo(photoX + radius, photoY + size);
          ctx.arcTo(photoX, photoY + size, photoX, photoY + size - radius, radius);
          ctx.lineTo(photoX, photoY + radius);
          ctx.arcTo(photoX, photoY, photoX + radius, photoY, radius);
          ctx.closePath();
          ctx.stroke();
        } else {
          // Square
          ctx.strokeRect(photoX, photoY, size, size);
        }

        ctx.restore();
      }
    }
  }

  // Name (centered in header)
  ctx.font = `bold 36px "${state.fonts.heading}", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(state.name, CANVAS_WIDTH / 2, 175);

  // Title (centered in header)
  ctx.font = `20px "${state.fonts.body}", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(state.title, CANVAS_WIDTH / 2, 202);

  // Main content below header
  y = headerHeight + 30;
  ctx.textAlign = 'left';

  // Contact info (centered row)
  const contacts = [state.email, state.phone, state.location].filter(Boolean);
  if (contacts.length > 0) {
    ctx.font = `11px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText(contacts.join(' • '), CANVAS_WIDTH / 2, y);
    y += 20;
  }

  // Social icons (centered)
  const socialLinks = [];
  if (state.linkedin) socialLinks.push({ icon: 'linkedin', url: state.linkedin });
  if (state.github) socialLinks.push({ icon: 'github', url: state.github });
  if (state.website) socialLinks.push({ icon: 'website', url: state.website });
  if (state.twitter) socialLinks.push({ icon: 'twitter', url: state.twitter });
  if (state.linktree) socialLinks.push({ icon: 'linktree', url: state.linktree });

  if (socialLinks.length > 0) {
    const iconSize = 20;
    const iconGap = 12;
    const totalWidth = socialLinks.length * iconSize + (socialLinks.length - 1) * iconGap;
    let iconX = CANVAS_WIDTH / 2 - totalWidth / 2;

    socialLinks.forEach(link => {
      drawSocialIcon(ctx, link.icon, iconX, y - 4, iconSize);
      iconX += iconSize + iconGap;
    });
    y += 30;
  }

  // Two-column content below
  const leftColX = padding;
  const leftColWidth = (CANVAS_WIDTH - padding * 3) / 2;
  const rightColX = leftColX + leftColWidth + padding;
  const rightColWidth = leftColWidth;

  // Left column: Experience
  let leftY = y;
  ctx.textAlign = 'left';

  if (state.summary) {
    ctx.font = `13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#444444';
    leftY = wrapText(ctx, state.summary, leftColX, leftY, CANVAS_WIDTH - padding * 2, 20);
    leftY += spacing.section;
  }

  if (state.experience.length > 0) {
    ctx.font = `bold 18px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText('EXPERIENCE', leftColX, leftY);
    leftY += spacing.header;

    state.experience.forEach(exp => {
      ctx.font = `bold 15px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.fillText(exp.company, leftColX, leftY);
      leftY += 18;

      ctx.font = `14px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#333333';
      ctx.fillText(exp.role, leftColX, leftY);
      leftY += 16;

      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.fillText(`${exp.dates} • ${exp.location}`, leftColX, leftY);
      leftY += 16;

      if (exp.description) {
        ctx.font = `12px "${state.fonts.body}", sans-serif`;
        ctx.fillStyle = '#555555';
        leftY = wrapText(ctx, exp.description, leftColX, leftY, leftColWidth, 17);
      }
      leftY += spacing.item;
    });
  }

  // Right column: Skills, Education, etc.
  let rightY = y;
  drawSidebarSections(ctx, rightColX, rightColWidth, rightY, spacing);
}

// Draw sidebar sections (configurable)
function drawSidebarSections(ctx, x, width, startY, spacing) {
  let y = startY;
  const padding = 20;

  state.sidebarSections.forEach(section => {
    if (!section.enabled) return;

    y += spacing.paragraph;

    // Section header
    ctx.font = `bold 16px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = state.layout.template === 'big-header' ? '#000000' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(section.title, x + padding, y);
    y += spacing.header;

    // Section content
    switch (section.id) {
      case 'skills':
        y = drawSkillsSection(ctx, x, width, y, spacing, padding);
        break;
      case 'education':
        y = drawEducationSection(ctx, x, width, y, spacing, padding);
        break;
      case 'languages':
        y = drawLanguagesSection(ctx, x, width, y, spacing, padding);
        break;
      case 'certifications':
        y = drawCertificationsSection(ctx, x, width, y, spacing, padding);
        break;
      case 'custom1':
        y = drawCustomSection(ctx, x, width, y, spacing, padding, section);
        break;
      case 'gaming':
        if (state.gaming.enabled) {
          y = drawGamingSection(ctx, x, width, y, spacing, padding);
        }
        break;
    }
  });

  return y;
}

// Draw skills section
function drawSkillsSection(ctx, x, width, y, spacing, padding) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';

  state.skills.forEach(skill => {
    ctx.font = `14px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(skill.name, x + padding, y);
    y += 18;

    // Draw hearts on new line
    const heartsX = x + padding;
    const heartsY = y;
    for (let i = 0; i < 5; i++) {
      const heartX = heartsX + i * 18;
      ctx.fillStyle = i < skill.hearts ? '#ef4444' : '#666666';
      drawHeart(ctx, heartX, heartsY, 12);
    }
    y += spacing.item + 8;
  });

  return y;
}

// Draw education section
function drawEducationSection(ctx, x, width, y, spacing, padding) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';
  const secondaryColor = state.layout.template === 'big-header' ? '#666666' : '#dddddd';
  const tertiaryColor = state.layout.template === 'big-header' ? '#888888' : '#cccccc';

  state.education.forEach(edu => {
    ctx.font = `bold 13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = textColor;
    y = wrapText(ctx, edu.school, x + padding, y, width - padding * 2, 17);

    ctx.font = `12px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = secondaryColor;
    y = wrapText(ctx, edu.degree, x + padding, y, width - padding * 2, 16);

    ctx.font = `11px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = tertiaryColor;
    ctx.fillText(edu.dates, x + padding, y);
    y += 13;

    if (edu.location) {
      ctx.fillText(edu.location, x + padding, y);
      y += 13;
    }
    y += spacing.item;
  });

  return y;
}

// Draw languages section
function drawLanguagesSection(ctx, x, width, y, spacing, padding) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';

  state.languages.forEach(lang => {
    ctx.font = `13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(`${lang.name}: ${lang.level}`, x + padding, y);
    y += spacing.item + 5;
  });

  return y;
}

// Draw certifications section
function drawCertificationsSection(ctx, x, width, y, spacing, padding) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';
  const secondaryColor = state.layout.template === 'big-header' ? '#666666' : '#dddddd';

  state.certifications.forEach(cert => {
    ctx.font = `bold 13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = textColor;
    y = wrapText(ctx, cert.name, x + padding, y, width - padding * 2, 17);

    ctx.font = `11px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = secondaryColor;
    if (cert.issuer) {
      ctx.fillText(cert.issuer, x + padding, y);
      y += 13;
    }
    if (cert.date) {
      ctx.fillText(cert.date, x + padding, y);
      y += 13;
    }
    y += spacing.item;
  });

  return y;
}

// Draw custom section
function drawCustomSection(ctx, x, width, y, spacing, padding, section) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';

  if (section.content) {
    ctx.font = `13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = textColor;
    y = wrapText(ctx, section.content, x + padding, y, width - padding * 2, 18);
    y += spacing.section;
  }

  return y;
}

// Draw gaming section
function drawGamingSection(ctx, x, width, y, spacing, padding) {
  const textColor = state.layout.template === 'big-header' ? '#333333' : '#ffffff';
  const secondaryColor = state.layout.template === 'big-header' ? '#666666' : '#dddddd';

  if (state.gaming.psnStats) {
    const stats = state.gaming.psnStats;
    ctx.font = `12px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = secondaryColor;
    ctx.fillText(`PSN Level ${stats.level} • ${stats.games} games`, x + padding, y);
    y += 16;
    ctx.fillText(`🥇 ${stats.trophies?.platinum} 🥈 ${stats.trophies?.gold} 🥉 ${stats.trophies?.silver} 🏅 ${stats.trophies?.bronze}`, x + padding, y);
    y += spacing.item + 5;
  }

  if (state.gaming.steamStats) {
    const stats = state.gaming.steamStats;
    ctx.font = `12px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = secondaryColor;
    ctx.fillText(`Steam: ${stats.games} games`, x + padding, y);
    y += 16;
    if (stats.playtime) {
      ctx.fillText(`${Math.round(stats.playtime)} hours played`, x + padding, y);
      y += 16;
    }
  }

  return y;
}

// Draw column content (left or right)
function drawColumnContent(ctx, x, width, spacing) {
  const padding = 20;
  let y = 30;

  // Profile photo - use cached image or create new one
  if (state.assets.profilePhoto) {
    // Use cached image if available, otherwise create new one
    const img = window._loadedProfileImage || new Image();

    // Only proceed if image is loaded (has width)
    if (!img.complete || !img.width) {
      // Image not ready yet, set src and it will render on next pass
      if (!window._loadedProfileImage) {
        img.onload = () => {
          window._loadedProfileImage = img;
          // Re-render when image loads
          renderCanvas();
        };
        img.src = state.assets.profilePhoto;
      }
      console.log('Image not ready yet, skipping render');
    } else {
      console.log('Rendering profile photo:', img.width, 'x', img.height);
      const size = 100;
      const photoX = x + (width - size) / 2;
      const photoY = y;

      ctx.save();

      // Apply clipping path based on shape
      if (state.assets.photoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(photoX + size/2, photoY + size/2, size/2, 0, Math.PI * 2);
        ctx.clip();
      } else if (state.assets.photoShape === 'rounded') {
        const radius = 15;
        ctx.beginPath();
        ctx.moveTo(photoX + radius, photoY);
        ctx.lineTo(photoX + size - radius, photoY);
        ctx.arcTo(photoX + size, photoY, photoX + size, photoY + radius, radius);
        ctx.lineTo(photoX + size, photoY + size - radius);
        ctx.arcTo(photoX + size, photoY + size, photoX + size - radius, photoY + size, radius);
        ctx.lineTo(photoX + radius, photoY + size);
        ctx.arcTo(photoX, photoY + size, photoX, photoY + size - radius, radius);
        ctx.lineTo(photoX, photoY + radius);
        ctx.arcTo(photoX, photoY, photoX + radius, photoY, radius);
        ctx.closePath();
        ctx.clip();
      }
      // Square: no clipping needed

      // Calculate aspect ratio to cover the square photo area
      const imgAspect = img.width / img.height;
      let srcX, srcY, srcSize;

      if (imgAspect > 1) {
        // Image is wider, crop sides
        srcSize = img.height;
        srcX = (img.width - img.height) / 2;
        srcY = 0;
      } else {
        // Image is taller, crop top/bottom
        srcSize = img.width;
        srcX = 0;
        srcY = (img.height - img.width) / 2;
      }

      // Draw cropped square image
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, photoX, photoY, size, size);
      ctx.restore();

      // Draw border if enabled
      if (state.assets.photoBorder) {
        ctx.save();
        ctx.strokeStyle = state.assets.borderColor || '#8b5cf6';
        ctx.lineWidth = state.assets.borderWidth || 4;

        if (state.assets.photoShape === 'circle') {
          ctx.beginPath();
          ctx.arc(photoX + size/2, photoY + size/2, size/2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (state.assets.photoShape === 'rounded') {
          const radius = 15;
          ctx.beginPath();
          ctx.moveTo(photoX + radius, photoY);
          ctx.lineTo(photoX + size - radius, photoY);
          ctx.arcTo(photoX + size, photoY, photoX + size, photoY + radius, radius);
          ctx.lineTo(photoX + size, photoY + size - radius);
          ctx.arcTo(photoX + size, photoY + size, photoX + size - radius, photoY + size, radius);
          ctx.lineTo(photoX + radius, photoY + size);
          ctx.arcTo(photoX, photoY + size, photoX, photoY + size - radius, radius);
          ctx.lineTo(photoX, photoY + radius);
          ctx.arcTo(photoX, photoY, photoX + radius, photoY, radius);
          ctx.closePath();
          ctx.stroke();
        } else {
          // Square
          ctx.strokeRect(photoX, photoY, size, size);
        }

        ctx.restore();
      }

      y += size + 20;
    }
  }

  // Location (if present)
  if (state.location) {
    ctx.font = `14px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(state.location, x + width/2, y);
    y += spacing.section;
  }

  // Render configurable sidebar sections
  y = drawSidebarSections(ctx, x, width, y, spacing);

  // Social Links at bottom of column (only in standard template)
  const socialLinks = [];
  if (state.github) socialLinks.push({ icon: 'github', url: state.github });
  if (state.website) socialLinks.push({ icon: 'website', url: state.website });
  if (state.linktree) socialLinks.push({ icon: 'linktree', url: state.linktree });
  if (state.twitter) socialLinks.push({ icon: 'twitter', url: state.twitter });
  if (state.linkedin) socialLinks.push({ icon: 'linkedin', url: state.linkedin });

  if (socialLinks.length > 0) {
    // Position at bottom of canvas with padding
    const bottomY = CANVAS_HEIGHT - 80;
    const iconSize = 24;
    const iconGap = 16;
    const totalWidth = socialLinks.length * iconSize + (socialLinks.length - 1) * iconGap;
    let iconX = x + (width - totalWidth) / 2;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Draw label
    ctx.font = `bold 12px "${state.fonts.body}", sans-serif`;
    ctx.fillText('CONNECT', x + width/2, bottomY - 20);

    // Draw icons
    socialLinks.forEach(link => {
      drawSocialIcon(ctx, link.icon, iconX, bottomY, iconSize);
      iconX += iconSize + iconGap;
    });

    ctx.restore();
  }
}

// Draw main content area
function drawMainContent(ctx, x, width, spacing) {
  const padding = 30;
  let y = 50;

  // Name
  ctx.font = `bold 32px "${state.fonts.heading}", sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText(state.name, x + padding, y);
  y += 35;

  // Title
  ctx.font = `20px "${state.fonts.body}", sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.fillText(state.title, x + padding, y);
  y += spacing.section;

  // Contact info
  const contacts = [state.email, state.phone].filter(Boolean);
  if (contacts.length > 0) {
    ctx.font = `11px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText(contacts.join(' • '), x + padding, y);
    y += 20;
  }

  // Social links icons
  const socialLinks = [];
  if (state.linkedin) socialLinks.push({ icon: 'linkedin', url: state.linkedin });
  if (state.github) socialLinks.push({ icon: 'github', url: state.github });
  if (state.website) socialLinks.push({ icon: 'website', url: state.website });
  if (state.twitter) socialLinks.push({ icon: 'twitter', url: state.twitter });
  if (state.linktree) socialLinks.push({ icon: 'linktree', url: state.linktree });

  if (socialLinks.length > 0) {
    const iconSize = 20;
    const iconGap = 12;
    let iconX = x + padding;

    socialLinks.forEach(link => {
      drawSocialIcon(ctx, link.icon, iconX, y - 4, iconSize);
      iconX += iconSize + iconGap;
    });
    y += spacing.section;
  }

  // Summary
  if (state.summary) {
    ctx.font = `13px "${state.fonts.body}", sans-serif`;
    ctx.fillStyle = '#444444';
    y = wrapText(ctx, state.summary, x + padding, y, width - padding * 2, 18);
    y += spacing.paragraph;
  }

  // Experience
  if (state.experience.length > 0) {
    y += spacing.paragraph;
    ctx.font = `bold 18px "${state.fonts.heading}", sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText('EXPERIENCE', x + padding, y);
    y += spacing.header;

    state.experience.forEach(exp => {
      ctx.font = `bold 15px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.fillText(exp.company, x + padding, y);
      y += 18;

      ctx.font = `14px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#333333';
      ctx.fillText(exp.role, x + padding, y);
      y += 16;

      ctx.font = `12px "${state.fonts.body}", sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.fillText(`${exp.dates} • ${exp.location}`, x + padding, y);
      y += 16;

      if (exp.description) {
        ctx.font = `12px "${state.fonts.body}", sans-serif`;
        ctx.fillStyle = '#555555';
        y = wrapText(ctx, exp.description, x + padding, y, width - padding * 2, 17);
        y += spacing.paragraph;
      }
      y += spacing.item;
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

// Wrap text helper with line break and bullet support
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;

  // Split by explicit line breaks first
  const paragraphs = text.split('\n');
  let lineY = y;

  paragraphs.forEach((para, paraIndex) => {
    // Check if line starts with bullet point
    const isBullet = /^[•\-\*]\s/.test(para);
    let lineText = para;
    let lineX = x;

    if (isBullet) {
      // Render bullet
      const bullet = para.charAt(0);
      ctx.fillText(bullet, x, lineY);
      lineText = para.substring(2); // Remove bullet and space
      lineX = x + 15; // Indent text after bullet
    }

    // Wrap words within this line
    const words = lineText.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth - (isBullet ? 15 : 0) && n > 0) {
        ctx.fillText(line, lineX, lineY);
        line = words[n] + ' ';
        lineY += lineHeight;
        lineX = isBullet ? x + 15 : x; // Keep indent for wrapped bullet lines
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      ctx.fillText(line, lineX, lineY);
    }

    // Add space after paragraph (except last one)
    if (paraIndex < paragraphs.length - 1) {
      lineY += lineHeight;
    }
    lineY += lineHeight;
  });

  return lineY;
}

// Map icon types to Simple Icons slugs
const ICON_SLUGS = {
  github: 'github',
  linkedin: 'linkedin',
  twitter: 'x',
  website: 'googlechrome',
  linktree: 'linktree',
};

// Load social icon from Simple Icons CDN
async function loadSocialIcon(type) {
  const slug = ICON_SLUGS[type] || 'link';
  const url = `https://cdn.simpleicons.org/${slug}/white`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load icon: ${type}`);
      resolve(null); // Resolve with null instead of rejecting
    };
    img.src = url;
  });
}

// Preload all social icons
export async function preloadSocialIcons() {
  if (!window._socialIcons) {
    window._socialIcons = {};
  }

  const types = ['github', 'linkedin', 'twitter', 'website', 'linktree'];
  const promises = types.map(async (type) => {
    if (!window._socialIcons[type]) {
      window._socialIcons[type] = await loadSocialIcon(type);
    }
  });

  await Promise.all(promises);
}

// Draw social media icon using preloaded images
function drawSocialIcon(ctx, type, x, y, size) {
  const img = window._socialIcons?.[type];

  if (img && img.complete && img.width) {
    ctx.save();
    // Draw the SVG icon
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } else {
    // Fallback: draw a simple circle if icon not loaded
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
