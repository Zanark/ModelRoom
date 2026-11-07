import './styles.css';
import { Viewer } from './viewer.js';
import { createBox, defaultRecipe, presets } from './models/box.js';
import { createPaperTextures } from './textures.js';
import { downloadBlob, exportGLB, importGLB, inspectModel, disposeModel, MAX_GLB_BYTES } from './model-io.js';

const $ = (id) => document.getElementById(id);
let viewer;
let model;
let currentRecipe = defaultRecipe();
let filename = presets.kraft.file;
let importSequence = 0;
let busyExport = false;
let noticeTimer;
const references = [];

function notify(message, error = false) {
  clearTimeout(noticeTimer);
  const status = $('status');
  status.textContent = message;
  status.dataset.error = String(error);
  status.hidden = false;
  status.setAttribute('role', error ? 'alert' : 'status');
  if (!error) noticeTimer = setTimeout(() => { status.hidden = true; }, 6500);
}
function report(error) { console.error(error); notify(error.message || 'An unexpected error occurred.', true); }
function setPressed(button, value) { button.setAttribute('aria-pressed', String(value)); }
function syncStats() {
  const info = inspectModel(viewer.root);
  $('triangles').textContent = info.triangles.toLocaleString();
  $('meshes').textContent = String(info.meshes);
  $('bounds').textContent = `${Math.round(info.size.x * 1000)} x ${Math.round(info.size.y * 1000)} x ${Math.round(info.size.z * 1000)} mm`;
  viewer.updateBounds(info);
}
function renderParts(parts) {
  $('parts').replaceChildren(...parts.map((part) => {
    const button = document.createElement('button');
    button.textContent = part.name || 'Unnamed mesh';
    button.type = 'button';
    button.addEventListener('click', () => viewer.select(part));
    button.dataset.part = part.uuid;
    button.setAttribute('aria-pressed', 'false');
    return button;
  }));
  $('part-count').textContent = `(${parts.length})`;
}
function syncRecipeControls() {
  for (const key of ['width', 'height', 'depth']) $(key).value = String(Math.round(currentRecipe[key] * 1000));
  $('openness').value = String(Math.round(currentRecipe.openness * 100));
  $('openness-value').textContent = `${Math.round(currentRecipe.openness * 100)}%`;
  $('paper-color').value = currentRecipe.color;
}
function loadBox(recipe, fit = true) {
  const next = createBox(recipe, createPaperTextures());
  const oldCamera = viewer.camera.position.clone();
  const oldTarget = viewer.controls.target.clone();
  viewer.setModel(next.root, next.parts);
  model = next;
  currentRecipe = next.getRecipe();
  filename = presets[recipe.preset].file;
  $('document-name').textContent = filename;
  $('model-title').textContent = presets[recipe.preset].title;
  $('model-description').textContent = presets[recipe.preset].description;
  $('material-tag').textContent = presets[recipe.preset].material;
  $('model-caption').replaceChildren();
  $('model-caption').append('An ordinary object.', document.createElement('br'));
  const strong = document.createElement('strong');
  strong.textContent = 'A thousand little details.';
  $('model-caption').append(strong);
  $('box-controls').hidden = false;
  $('export-recipe').disabled = false;
  $('export-glb').disabled = false;
  $('ready-badge').replaceChildren();
  const dot = document.createElement('span');
  dot.className = 'live-dot';
  $('ready-badge').append(dot, ' Ready to explore');
  document.querySelectorAll('[data-preset]').forEach((button) => {
    const selected = button.dataset.preset === recipe.preset;
    setPressed(button, selected);
    button.classList.toggle('active', selected);
  });
  syncRecipeControls();
  renderParts(next.parts);
  syncStats();
  viewer.setWireframe($('wireframe').getAttribute('aria-pressed') === 'true');
  if (!fit) {
    viewer.camera.position.copy(oldCamera);
    viewer.controls.target.copy(oldTarget);
    viewer.controls.update();
  }
}

function bindUI() {
  document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => {
    importSequence++;
    loadBox(defaultRecipe(button.dataset.preset));
  }));
  $('openness').addEventListener('input', () => {
    if (!model) return;
    model.setOpen(Number($('openness').value) / 100);
    currentRecipe = model.getRecipe();
    $('openness-value').textContent = `${$('openness').value}%`;
    syncStats();
    viewer.fit();
  });
  for (const key of ['width', 'height', 'depth']) $(key).addEventListener('change', () => {
    try { loadBox({ ...currentRecipe, [key]: Number($(key).value) / 1000 }); }
    catch (error) { syncRecipeControls(); report(error); }
  });
  $('paper-color').addEventListener('change', () => {
    try { loadBox({ ...currentRecipe, color: $('paper-color').value }, false); }
    catch (error) { report(error); }
  });
  $('reset-model').addEventListener('click', () => loadBox(defaultRecipe(currentRecipe.preset)));
  $('fit').addEventListener('click', () => viewer.fit());
  $('rotate').addEventListener('click', () => {
    viewer.controls.autoRotate = !viewer.controls.autoRotate;
    setPressed($('rotate'), viewer.controls.autoRotate);
    viewer.requestRender();
  });
  for (const id of ['grid', 'wireframe']) $(id).addEventListener('click', () => {
    const enabled = $(id).getAttribute('aria-pressed') !== 'true';
    setPressed($(id), enabled);
    if (id === 'grid') viewer.grid.visible = enabled;
    else viewer.setWireframe(enabled);
    viewer.requestRender();
  });
  $('floor').addEventListener('change', () => { viewer.ground.visible = $('floor').checked; viewer.requestRender(); });
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    viewer.controls.autoRotate = false;
    setPressed($('rotate'), false);
    if (button.dataset.view === 'bottom') {
      $('floor').checked = false;
      viewer.ground.visible = false;
      viewer.grid.visible = false;
      setPressed($('grid'), false);
    }
    viewer.fit(button.dataset.view);
    $('view-name').textContent = `/ ${button.title.toUpperCase()}`;
  }));
  document.querySelectorAll('[data-light]').forEach((button) => button.addEventListener('click', () => {
    viewer.setLight(button.dataset.light);
    document.querySelectorAll('[data-light]').forEach((other) => setPressed(other, other === button));
  }));
  $('light-angle').addEventListener('input', () => {
    const angle = Number($('light-angle').value);
    viewer.lights.rotation.y = angle * Math.PI / 180;
    $('light-angle-value').textContent = `${angle}\u00b0`;
    viewer.requestRender();
  });
  viewer.lights.rotation.y = 35 * Math.PI / 180;
  $('clear-selection').addEventListener('click', () => viewer.clearSelection());
  $('snapshot').addEventListener('click', async () => {
    try { downloadBlob(await viewer.capture(), `${filename}-view.png`); notify('Viewport saved as a PNG.'); }
    catch (error) { report(error); }
  });
  $('export-glb').addEventListener('click', async () => {
    if (busyExport) return;
    busyExport = true;
    $('export-glb').disabled = true;
    try {
      const buffer = await exportGLB(viewer.root);
      downloadBlob(new Blob([buffer], { type: 'model/gltf-binary' }), `${filename}.glb`);
      notify('Model downloaded. In Blender: File > Import > glTF 2.0.');
    } catch (error) { report(error); }
    finally { busyExport = false; $('export-glb').disabled = false; }
  });
  $('export-recipe').addEventListener('click', () => {
    if (!model) return;
    downloadBlob(new Blob([JSON.stringify(model.getRecipe(), null, 2)], { type: 'application/json' }), `${filename}.recipe.json`);
    notify('Construction recipe saved. This JSON is not a Blender model; use GLB for Blender.');
  });
  $('model-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const sequence = ++importSequence;
    try {
      if (!/\.glb$/i.test(file.name)) throw new Error('Choose a self-contained .glb model.');
      if (file.size > MAX_GLB_BYTES) throw new Error('Please use a GLB smaller than 50 MB.');
      const root = await importGLB(await file.arrayBuffer());
      if (sequence !== importSequence) { disposeModel(root); return; }
      const parts = [];
      root.traverse((node) => { if (node.isMesh) parts.push(node); });
      viewer.setModel(root, parts);
      model = null;
      filename = file.name.replace(/\.glb$/i, '').replace(/[^a-z0-9._-]/gi, '-').slice(0, 100) || 'local-model';
      $('model-title').textContent = file.name;
      $('document-name').textContent = filename;
      $('model-description').textContent = 'Your local model, opened only in this browser. Its current static pose can be inspected and re-exported.';
      $('material-tag').textContent = 'LOCAL GLB';
      $('box-controls').hidden = true;
      $('export-recipe').disabled = true;
      $('model-caption').textContent = 'Your model. Your next possibility.';
      document.querySelectorAll('[data-preset]').forEach((button) => { setPressed(button, false); button.classList.remove('active'); });
      renderParts(parts);
      syncStats();
      viewer.setWireframe($('wireframe').getAttribute('aria-pressed') === 'true');
      notify(`Opened ${file.name}. No file was uploaded.`);
    } catch (error) { report(error); }
  });
}

$('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme-icon').textContent = dark ? '\u2600' : '\u263d';
  $('theme').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  viewer?.requestRender();
});
$('help-open').addEventListener('click', () => $('help-dialog').showModal());
$('blender-help').addEventListener('click', (event) => { event.preventDefault(); $('help-dialog').showModal(); });
$('references').addEventListener('change', (event) => {
  for (const file of event.target.files) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      report(new Error(`${file.name}: use a PNG, JPEG or WebP under 10 MB.`));
      continue;
    }
    if (references.length >= 6) { report(new Error('Use up to six reference images per brief.')); break; }
    references.push({ file, url: URL.createObjectURL(file) });
  }
  event.target.value = '';
  renderReferences();
});
function renderReferences() {
  $('reference-list').replaceChildren(...references.map((reference, index) => {
    const chip = document.createElement('div');
    const image = document.createElement('img');
    image.src = reference.url;
    image.alt = reference.file.name;
    const name = document.createElement('span');
    name.textContent = reference.file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '\u00d7';
    remove.setAttribute('aria-label', `Remove ${reference.file.name}`);
    remove.addEventListener('click', () => { URL.revokeObjectURL(reference.url); references.splice(index, 1); renderReferences(); });
    chip.append(image, name, remove);
    return chip;
  }));
}
$('brief-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = $('prompt').value.trim();
  if (!prompt) { report(new Error('Write an idea before saving a brief.')); return; }
  const brief = {
    schemaVersion: 1, kind: 'model-room-brief', prompt,
    references: references.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
    currentModel: model?.getRecipe() ?? { kind: 'imported-glb', filename },
    instructions: 'Give this brief and the original reference images to your coding agent in ModelRoom. This file contains image metadata only, not image bytes. The static viewer does not run an AI.',
  };
  downloadBlob(new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }), 'model-room-brief.json');
  notify('Brief saved. Give it and your original reference images to your agent.');
});

try {
  viewer = new Viewer($('viewport'), (part) => {
    $('selection').textContent = part ? `Selected: ${part.name || 'Unnamed mesh'}` : 'Click a part to inspect it.';
    document.querySelectorAll('[data-part]').forEach((button) => setPressed(button, button.dataset.part === part?.uuid));
  }, report);
  bindUI();
  loadBox(currentRecipe);
  $('viewport-loading').remove();
  $('viewport').dataset.ready = 'true';
  window.modelRoom = Object.freeze({
    snapshot: () => ({
      camera: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(),
      recipe: model?.getRecipe() ?? null, triangles: viewer.info.triangles,
      meshes: viewer.info.meshes, selected: viewer.selected?.name ?? null,
      renderCalls: viewer.renderer.info.render.calls,
    }),
  });
} catch (error) {
  $('viewport-loading').textContent = 'The 3D workspace could not start. A WebGL2-capable browser is required. Reload after resolving the error below.';
  $('ready-badge').textContent = 'Graphics unavailable';
  report(error);
}
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  references.forEach((reference) => URL.revokeObjectURL(reference.url));
  viewer?.dispose();
});
