import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const presets = {
  kraft: { title: 'The everyday box', file: 'everyday-box', color: '#b68b57', material: 'KRAFT PAPER', description: 'A little study in folded paper. Built from real, separate panels, not a hollow-looking cube.' },
  lilac: { title: 'A softer delivery', file: 'lilac-box', color: '#a99ad0', material: 'DYED PAPER', description: 'The same familiar folds, a softer personality. A lilac color study with a quiet cream label.' },
  ink: { title: 'After hours', file: 'ink-box', color: '#434957', material: 'DYED PAPER', description: 'A darker take on an everyday object. Matte ink-colored paper, clean edges, a warm little label.' },
};

export function validateRecipe(input) {
  if (!input || input.schemaVersion !== 1 || input.model !== 'cardboard-box') {
    throw new Error('This recipe must be a version 1 cardboard-box recipe.');
  }
  for (const key of ['width', 'height', 'depth']) {
    if (!Number.isFinite(input[key]) || input[key] < 0.1 || input[key] > 0.6) {
      throw new Error(`${key} must be between 100 and 600 mm.`);
    }
  }
  if (!Number.isFinite(input.openness) || input.openness < 0 || input.openness > 1) {
    throw new Error('Flap openness must be between 0 and 1.');
  }
  if (!/^#[a-f\d]{6}$/i.test(input.color)) throw new Error('Paper color must be a six-digit hex color.');
  if (!Object.hasOwn(presets, input.preset)) throw new Error('Unknown cardboard-box study.');
  return {
    schemaVersion: 1, model: 'cardboard-box', units: 'meters', preset: input.preset,
    width: input.width, height: input.height, depth: input.depth,
    openness: input.openness, color: input.color,
  };
}

export function defaultRecipe(preset = 'kraft') {
  if (!Object.hasOwn(presets, preset)) throw new Error('Unknown cardboard-box study.');
  return validateRecipe({
    schemaVersion: 1, model: 'cardboard-box', preset,
    width: 0.32, height: 0.24, depth: 0.26, openness: 0.72, color: presets[preset].color,
  });
}

export function createBox(input = defaultRecipe(), textures = {}) {
  const recipe = validateRecipe(input);
  const { width: w, height: h, depth: d } = recipe;
  const t = 0.004;
  const root = new THREE.Group();
  root.name = 'Model Room - Cardboard Box';
  root.userData = { modelRoom: recipe, description: 'Original procedural cardboard box. Dimensions in meters; Y up.' };
  const paper = new THREE.MeshStandardMaterial({ name: 'Matte kraft paper', color: recipe.color, roughness: 0.92, metalness: 0, map: textures.paper ?? null });
  const edge = new THREE.MeshStandardMaterial({ name: 'Cut paper edge', color: new THREE.Color(recipe.color).multiplyScalar(0.78), roughness: 1 });
  const parts = [];
  function panel(name, x, y, z, position, parent = root) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(x, y, z, 2, 0.00065), paper);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = true;
    parent.add(mesh);
    parts.push(mesh);
    return mesh;
  }
  panel('Bottom panel', w, t, d, [0, t / 2, 0]);
  panel('Front wall', w, h - t, t, [0, (h + t) / 2, d / 2 - t / 2]);
  panel('Back wall', w, h - t, t, [0, (h + t) / 2, -d / 2 + t / 2]);
  panel('Left wall', t, h - t, d - 2 * t, [-w / 2 + t / 2, (h + t) / 2, 0]);
  panel('Right wall', t, h - t, d - 2 * t, [w / 2 - t / 2, (h + t) / 2, 0]);

  const hinges = [];
  function flap(name, width, length, depth, position, axis, sign) {
    const pivot = new THREE.Group();
    pivot.name = `${name} hinge`;
    pivot.position.set(...position);
    root.add(pivot);
    const mesh = panel(name, width, length, depth, [0, length / 2, 0], pivot);
    // Thin end-grain bars give the cut edge a layered paper construction.
    const stripWidth = axis === 'x' ? width : depth;
    for (let layer = 0; layer < 3; layer++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? stripWidth - 0.002 : t / 7, t / 8, axis === 'x' ? t / 7 : stripWidth - 0.002), edge);
      strip.name = `${name} cut layer ${layer + 1}`;
      strip.position.set(axis === 'x' ? 0 : (layer - 1) * t / 3, length / 2 + 0.00005, axis === 'x' ? (layer - 1) * t / 3 : 0);
      mesh.add(strip);
    }
    hinges.push({ pivot, axis, sign });
  }
  flap('Front flap', w - 0.002, d / 2 - 0.001, t, [0, h + t / 2, d / 2 - t / 2], 'x', 1);
  flap('Back flap', w - 0.002, d / 2 - 0.001, t, [0, h + t / 2, -d / 2 + t / 2], 'x', -1);
  flap('Left flap', t, w / 2 - 0.002, d - 2 * t, [-w / 2 + t / 2, h - t / 2, 0], 'z', 1);
  flap('Right flap', t, w / 2 - 0.002, d - 2 * t, [w / 2 - t / 2, h - t / 2, 0], 'z', -1);

  if (textures.label) {
    const labelMaterial = new THREE.MeshStandardMaterial({ name: 'Printed paper label', map: textures.label, roughness: 0.95 });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.47, h * 0.37), labelMaterial);
    label.name = 'Printed shipping label';
    label.position.set(-w * 0.1, h * 0.52, d / 2 + 0.00035);
    root.add(label);
    label.userData.part = true;
    parts.push(label);
  }
  function setOpen(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Flap openness must be between 0 and 1.');
    recipe.openness = value;
    for (const { pivot, axis, sign } of hinges) pivot.rotation[axis] = sign * (-Math.PI / 2 + value * 2.35);
    root.updateMatrixWorld(true);
  }
  setOpen(recipe.openness);
  return { root, parts, setOpen, getRecipe: () => ({ ...recipe }) };
}
