import { state } from './state.js';
import { showToast } from './utils.js';

// Export resume as PDF
export function exportPDF() {
  const canvas = document.getElementById('resumeCanvas');
  if (!canvas) {
    showToast('Canvas not found');
    return;
  }

  let imgData;
  try {
    imgData = canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to export canvas:', err);
    showToast('Cannot export: images blocked by CORS');
    return;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  const pdfW = 210; // A4 width in mm
  const pdfH = (ch / cw) * pdfW;

  const loadAndGenerate = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: pdfH > pdfW ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [pdfW, pdfH],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

    const name = state.name || 'resume';
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    doc.save(filename);
    showToast('Resume exported!');
  };

  if (window.jspdf) {
    loadAndGenerate();
  } else {
    showToast('Loading PDF library...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    script.onload = loadAndGenerate;
    script.onerror = () => showToast('Failed to load PDF library');
    document.head.appendChild(script);
  }
}
