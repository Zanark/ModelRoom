import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture, Vector3 } from 'three';
import { createBox, defaultRecipe, validateRecipe } from '../src/models/box.js';
import { inspectModel, readGLBManifest, disposeModel } from '../src/model-io.js';

function glb(manifest) {
  const text = JSON.stringify(manifest);
  const data = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4));
  const buffer = new ArrayBuffer(20 + data.length);
  const view = new DataView(buffer);
  [0x46546c67, 2, buffer.byteLength, data.length, 0x4e4f534a].forEach((value, i) => view.setUint32(i * 4, value, true));
  new Uint8Array(buffer, 20).set(data);
  return buffer;
}
const nearly = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test('recipe validates physical range and does not retain extra executable/unknown data', () => {
  for (const dimension of ['width', 'height', 'depth']) {
    for (const value of [0.0999, 0.6001, NaN, Infinity, '0.32', undefined]) {
      assert.throws(() => validateRecipe({ ...defaultRecipe(), [dimension]: value }), new RegExp(dimension));
    }
    for (const value of [0.1, 0.6]) assert.equal(validateRecipe({ ...defaultRecipe(), [dimension]: value })[dimension], value);
  }
  for (const value of [-1, 1.01, NaN, '0.5']) assert.throws(() => validateRecipe({ ...defaultRecipe(), openness: value }), /openness/);
  for (const color of ['red', '#fff', '#zzzzzz', null]) assert.throws(() => validateRecipe({ ...defaultRecipe(), color }), /color/);
  assert.throws(() => defaultRecipe('toString'), /Unknown/);
  assert.throws(() => validateRecipe({ ...defaultRecipe(), schemaVersion: 2 }), /version 1/);
  const input = { ...defaultRecipe(), untrustedCode: 'not retained' };
  const result = validateRecipe(input);
  assert.equal(result.units, 'meters');
  assert.equal(Object.hasOwn(result, 'untrustedCode'), false);
  result.width = 0.5;
  assert.equal(input.width, 0.32);
});

test('box has separate panels, finite positions/normals, real thickness and floor contact', () => {
  const model = createBox();
  assert.equal(model.parts.length, 9);
  assert.equal(new Set(model.parts.map((part) => part.name)).size, 9);
  for (const part of model.parts) {
    for (const attribute of ['position', 'normal']) {
      assert.ok([...part.geometry.attributes[attribute].array].every(Number.isFinite));
    }
  }
  const bottom = model.root.getObjectByName('Bottom panel');
  const box = new Box3().setFromObject(bottom);
  const size = box.getSize(new Vector3());
  nearly(size.x, 0.32);
  nearly(size.y, 0.004);
  nearly(size.z, 0.26);
  nearly(box.min.y, 0);
  for (const name of ['Front', 'Back', 'Left', 'Right']) {
    assert.equal(model.root.getObjectByName(`${name} flap`).parent.name, `${name} flap hinge`);
  }
  disposeModel(model.root);
});

test('flaps remain attached to stationary crease positions through extremes and export metadata follows pose', () => {
  const model = createBox();
  const hinges = ['Front', 'Back', 'Left', 'Right'].map((name) => model.root.getObjectByName(`${name} flap hinge`));
  const original = hinges.map((hinge) => hinge.getWorldPosition(new Vector3()));
  model.setOpen(0);
  const closed = inspectModel(model.root);
  model.setOpen(1);
  const open = inspectModel(model.root);
  assert.ok(open.size.x > closed.size.x * 1.5);
  assert.ok(open.size.z > closed.size.z * 1.5);
  assert.ok(open.size.y > closed.size.y);
  hinges.forEach((hinge, i) => nearly(hinge.getWorldPosition(new Vector3()).distanceTo(original[i]), 0));
  assert.equal(model.getRecipe().openness, 1);
  assert.equal(model.root.userData.modelRoom.openness, 1);
  assert.throws(() => model.setOpen(NaN), /openness/);
  assert.equal(model.getRecipe().openness, 1);
  disposeModel(model.root);
});

test('all supported dimension extremes yield nonempty finite geometry and statistics include edge details', () => {
  for (const [width, height, depth] of [[0.1, 0.6, 0.1], [0.6, 0.1, 0.6]]) {
    const model = createBox({ ...defaultRecipe(), width, height, depth });
    const info = inspectModel(model.root);
    assert.equal(info.meshes, 21);
    assert.ok(info.triangles > 1000);
    assert.ok([...info.size].every((value) => Number.isFinite(value) && value > 0));
    const body = new Box3().setFromObject(model.root.getObjectByName('Front wall'));
    nearly(body.getSize(new Vector3()).x, width);
    disposeModel(model.root);
  }
  assert.throws(() => inspectModel(new Group()), /bounds/);
});

test('binary input gate rejects malformed headers, external resources and required extensions', () => {
  assert.throws(() => readGLBManifest(new ArrayBuffer(8)), /valid/);
  const good = glb({ asset: { version: '2.0' }, buffers: [{ byteLength: 0 }] });
  assert.equal(readGLBManifest(good).asset.version, '2.0');
  for (const change of [[0, 0], [4, 1], [8, 24], [12, 100000], [16, 0]]) {
    const invalid = good.slice(0);
    new DataView(invalid).setUint32(...change, true);
    assert.throws(() => readGLBManifest(invalid), /valid/);
  }
  assert.throws(() => readGLBManifest(glb({ asset: { version: '1.0' } })), /2.0/);
  for (const key of ['buffers', 'images']) {
    assert.throws(() => readGLBManifest(glb({ asset: { version: '2.0' }, [key]: [{ uri: 'https://example.com/private-file' }] })), /self-contained/);
  }
  assert.throws(() => readGLBManifest(glb({ asset: { version: '2.0' }, extensionsRequired: ['KHR_draco_mesh_compression'] })), /without required/);
});

test('replacement cleanup releases shared resources once and detaches only the owned model', () => {
  const group = new Group();
  const root = new Group();
  const geometry = new BoxGeometry();
  const texture = new Texture();
  const material = new MeshStandardMaterial({ map: texture });
  root.add(new Mesh(geometry, material), new Mesh(geometry, material));
  group.add(root);
  const disposed = [];
  for (const resource of [geometry, texture, material]) resource.addEventListener('dispose', () => disposed.push(resource));
  disposeModel(root);
  assert.equal(root.parent, null);
  assert.equal(new Set(disposed).size, 3);
  assert.equal(disposed.length, 3);
});
