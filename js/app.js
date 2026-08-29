// Entry point. Loads what the browser had (or the example on a first visit),
// renders the three views, and wires events. Everything else is a module.
import { state, loadInitial, setDoc } from './state.js';
import { initEvents, switchTab, refreshSavedSelect, refreshYaml, confirmDialog } from './events.js';
import { renderContentPanel, renderDesignPanel } from './editor.js';
import { initPreview, renderPreview } from './preview.js';
import { fromYAML } from './serialize.js';
import { normalizeResume } from './schema.js';
import { takeHandoff } from './share.js';
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const origin = loadInitial();
  // A resume sent by view.html's "Make it yours", taken before anything renders
  // and removed as it is read, so it is offered exactly once (CONTRACTS.md C9).
  const handoff = takeHandoff();
  initEvents();
  initPreview();
  renderContentPanel();
  renderDesignPanel();
  refreshSavedSelect();
  switchTab(state.ui.tab || 'content');
  renderPreview();
  refreshYaml(true);

  if (origin === 'v1') showToast('Your resume from the previous version was migrated. Check the Content tab, then Save.', 5000);
  // Asked after the first render, so the person can see what they would replace.
  if (handoff) {
    const { model } = normalizeResume(handoff);
    const whose = model.basics.name ? `"${model.basics.name}"` : 'The shared resume';
    if (await confirmDialog({
      title: 'Open the shared resume?',
      body: `${whose} arrived in a share link. Opening it replaces the resume open here, which is not saved unless you saved it.`,
      ok: 'Open it', cancel: 'Keep mine',
    })) setDoc(model, { source: 'shared', docId: null });
    return;
  }
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
