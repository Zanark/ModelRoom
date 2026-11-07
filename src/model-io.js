import { Box3, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MAX_GLB_BYTES = 50 * 1024 * 1024;

export function inspectModel(root) {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root, true);
  if (box.isEmpty()) throw new Error('The model has no visible mesh bounds.');
  const size = box.getSize(new Vector3());
  if (![...size, ...box.min, ...box.max].every(Number.isFinite) || size.length() <= 0) throw new Error('The model has invalid or empty dimensions.');
  let meshes = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (!node.isMesh) return;
    meshes++;
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position?.count ?? 0) / 3;
  });
  if (!meshes) throw new Error('The model does not contain any meshes.');
  return { box, size, meshes, triangles: Math.round(triangles) };
}

export function readGLBManifest(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw new Error('Not a valid binary glTF (.glb) file.');
  if (buffer.byteLength > MAX_GLB_BYTES) throw new Error('Please use a GLB smaller than 50 MB.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error('Not a valid glTF 2.0 binary file.');
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || jsonLength > buffer.byteLength - 20) throw new Error('The GLB JSON chunk is invalid.');
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim());
  if (manifest.asset?.version !== '2.0') throw new Error('Only glTF 2.0 models are supported.');
  for (const item of [...(manifest.buffers ?? []), ...(manifest.images ?? [])]) {
    if (item.uri) throw new Error('Use a self-contained GLB with embedded textures and buffers, not external files.');
  }
  if (manifest.extensionsRequired?.length) throw new Error('This starter viewer supports core, uncompressed GLB files without required extensions.');
  return manifest;
}

export async function importGLB(buffer) {
  readGLBManifest(buffer);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  try {
    inspectModel(gltf.scene);
    gltf.scene.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    return gltf.scene;
  } catch (error) {
    disposeModel(gltf.scene);
    throw error;
  }
}

export async function exportGLB(root) {
  inspectModel(root);
  // Clone the hierarchy so exporting never changes the live model's parent or pose.
  const clone = root.clone(true);
  clone.updateMatrixWorld(true);
  const result = await new GLTFExporter().parseAsync(clone, { binary: true, trs: true, onlyVisible: true, maxTextureSize: 2048 });
  if (!(result instanceof ArrayBuffer)) throw new Error('The exporter did not produce a binary model.');
  return result;
}

export function disposeModel(root) {
  const resources = new Set();
  const bitmaps = new Set();
  root.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          resources.add(value);
          if (typeof value.source?.data?.close === 'function') bitmaps.add(value.source.data);
        }
      }
    }
  });
  for (const resource of resources) resource.dispose();
  for (const bitmap of bitmaps) bitmap.close();
  root.removeFromParent();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
