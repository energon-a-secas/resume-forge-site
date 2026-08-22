// Entry point. Loads what the browser had (or the example on a first visit),
// renders the three views, and wires events. Everything else is a module.
import { state, loadInitial, setDoc } from './state.js';
import { initEvents, switchTab, refreshSavedSelect, refreshYaml } from './events.js';
import { renderContentPanel, renderDesignPanel } from './editor.js';
import { initPreview, renderPreview } from './preview.js';
import { fromYAML } from './serialize.js';
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const origin = loadInitial();
  initEvents();
  initPreview();
  renderContentPanel();
  renderDesignPanel();
  refreshSavedSelect();
  switchTab(state.ui.tab || 'content');
  renderPreview();
  refreshYaml(true);

  if (origin === 'v1') showToast('Your resume from the previous version was migrated. Check the Content tab, then Save.', 5000);
  if (origin === 'none') {
    try {
      const res = await fetch('library/cloud-architect.yaml', { cache: 'no-cache' });
      const r = fromYAML(await res.text());
      if (r.model) {
        setDoc(r.model, { source: 'first-run', docId: null });
        state.dirty = false;
        showToast('This is an example resume. Import yours (YAML, JSON Resume, LinkedIn ZIP) or edit it on the left.', 6000);
      }
    } catch { /* offline first run: the blank document stays */ }
  }
});
