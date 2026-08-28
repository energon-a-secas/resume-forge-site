// The share viewer: it renders a resume that arrived in the URL fragment, and
// it does nothing else.
//
// The promise view.html makes to the reader is structural, and this file is
// where it could be broken. So: no fetch of the payload, no analytics (the page
// opts out of the fleet's counters in its head), and no replaceState, no form
// and no redirect that could move `#s=` into a query string, which is the only
// way a fragment ever reaches a server. "Make it yours" hands the tree to the
// builder through sessionStorage, same origin and same tab, then navigates to a
// URL that carries no fragment at all.
//
// It deliberately does not import state.js: this page never reads and never
// writes the visitor's own saved resumes. Contract C9.

import { normalizeResume } from './schema.js';
import { renderResume, pageCss } from './render.js';
import { ensureFonts } from './fonts.js';
import { decodeShare, payloadFromUrl } from './share.js';

const HANDOFF = 'resume-forge-v2:handoff';
const $ = (id) => document.getElementById(id);

let tree = null;

function show(what) {
  $('v-stage').hidden = what !== 'sheet';
  $('v-bar').hidden = what !== 'sheet';
  $('v-msg').hidden = what === 'sheet';
}

function fail(title, body) {
  $('v-msg-title').textContent = title;
  $('v-msg-body').textContent = body;
  tree = null;
  show('message');
}

/** A decoded payload that is not a resume is a broken link, not an empty resume. */
const looksLikeResume = (t) => !!(t && typeof t === 'object' && (t.resume || t.basics || t.sections));

async function render() {
  const payload = payloadFromUrl(location.hash);
  if (!payload) {
    fail('No resume in this link',
      'This page shows a resume that a share link carries with it. The address needs a #s= part. Open the builder to make one.');
    return;
  }

  try {
    tree = await decodeShare(payload);
  } catch {
    fail('This link did not open',
      'The address is cut off or was edited on the way here. Ask for it again, and paste it whole: everything after the # is the resume.');
    return;
  }
  if (!looksLikeResume(tree)) {
    fail('This link does not hold a resume',
      'It decoded to something else. Ask the sender for a fresh link from the Export menu.');
    return;
  }

  const { model } = normalizeResume(tree);
  ensureFonts(model.design);
  let style = $('r-page');
  if (!style) { style = document.createElement('style'); style.id = 'r-page'; document.head.appendChild(style); }
  style.textContent = pageCss(model.design);
  $('sheet-host').innerHTML = renderResume(model);
  // The print dialog proposes the document title as the file name, so the
  // reader's saved PDF is named after the person, not after this page.
  if (model.basics.name) document.title = model.basics.name;
  show('sheet');
}

/** Copy the resume into the builder, in this tab, through storage rather than the URL. */
function makeItYours() {
  if (!tree) return;
  try {
    sessionStorage.setItem(HANDOFF, JSON.stringify(tree));
  } catch {
    fail('This browser will not hand the resume over',
      'Copying it into the builder needs session storage, which this browser has turned off or filled up. The link itself still works: keep it and open it in a browser that allows storage.');
    return;
  }
  location.href = './';
}

document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'print') window.print();
  else if (act === 'mine') makeItYours();
});

// A forwarded link pasted into an open tab changes only the fragment, which
// does not reload the page. Without this the reader would see the old resume.
window.addEventListener('hashchange', render);

render();
