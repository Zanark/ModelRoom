import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { validateBytes } from 'gltf-validator';

const snapshot = (page) => page.evaluate(() => window.modelRoom.snapshot());
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#viewport')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#export-glb')).toBeEnabled();
});

test('renders original model, selects actual surfaces and exposes parts with no runtime CDN', async ({ page }) => {
  const errors = [];
  const remoteRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4174/')) remoteRequests.push(request.url()); });
  await page.reload();
  await expect(page.locator('#viewport')).toHaveAttribute('data-ready', 'true');
  expect((await snapshot(page)).meshes).toBe(22);
  await expect.poll(async () => (await snapshot(page)).renderCalls).toBeGreaterThan(10);
  await page.locator('[data-view="front"]').click();
  const canvas = page.locator('#viewport canvas');
  const bounds = await canvas.boundingBox();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator('#selection')).toHaveText(/Selected:/);
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Back wall', exact: true }).click();
  expect((await snapshot(page)).selected).toBe('Back wall');
  await page.locator('#clear-selection').click();
  expect((await snapshot(page)).selected).toBe(null);
  await page.locator('#blender-help').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close help' }).click();
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('pointer/keyboard orbit, pan and zoom change the camera and underside is reachable', async ({ page }) => {
  const canvas = await page.locator('#viewport canvas').boundingBox();
  const x = canvas.x + canvas.width * 0.45;
  const y = canvas.y + canvas.height * 0.5;
  let before = await snapshot(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 95, y + 30, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => distance((await snapshot(page)).camera, before.camera)).toBeGreaterThan(0.1);
  before = await snapshot(page);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 70, y - 25, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => distance((await snapshot(page)).target, before.target)).toBeGreaterThan(0.01);
  before = await snapshot(page);
  await page.mouse.wheel(0, -180);
  await expect.poll(async () => {
    const now = await snapshot(page);
    return distance(now.camera, now.target) / distance(before.camera, before.target);
  }).toBeLessThan(0.95);
  await page.locator('#viewport').focus();
  before = await snapshot(page);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => distance((await snapshot(page)).camera, before.camera)).toBeGreaterThan(0.01);
  await page.locator('[data-view="bottom"]').click();
  await expect.poll(async () => { const s = await snapshot(page); return s.camera[1] - s.target[1]; }).toBeLessThan(-0.2);
  await expect(page.locator('#floor')).not.toBeChecked();
  await expect(page.locator('#grid')).toHaveAttribute('aria-pressed', 'false');
  for (const view of ['top', 'back', 'left', 'right', 'iso']) {
    await page.locator(`[data-view="${view}"]`).click();
    expect((await snapshot(page)).camera.every(Number.isFinite)).toBe(true);
  }
});

test('articulation, dimensions, study color and studio controls are bound to real changes', async ({ page }) => {
  const initialBounds = await page.locator('#bounds').textContent();
  await page.locator('#openness').fill('0');
  await expect(page.locator('#openness-value')).toHaveText('0%');
  expect((await snapshot(page)).recipe.openness).toBe(0);
  expect(await page.locator('#bounds').textContent()).not.toBe(initialBounds);
  await page.locator('#width').fill('500');
  await page.locator('#width').press('Tab');
  expect((await snapshot(page)).recipe.width).toBe(0.5);
  await page.locator('#paper-color').fill('#cc7744');
  await page.locator('#paper-color').dispatchEvent('change');
  expect((await snapshot(page)).recipe.color).toBe('#cc7744');
  await page.locator('[data-preset="lilac"]').click();
  expect((await snapshot(page)).recipe).toMatchObject({ preset: 'lilac', width: 0.32, color: '#a99ad0' });
  const before = await page.locator('#viewport canvas').screenshot();
  await page.locator('[data-light="warm"]').click();
  await page.locator('#light-angle').fill('150');
  await expect(page.locator('#light-angle-value')).toHaveText('150\u00b0');
  await expect(page.locator('[data-light="warm"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => Buffer.compare(before, await page.locator('#viewport canvas').screenshot())).not.toBe(0);
  await page.locator('#wireframe').click();
  await expect(page.locator('#wireframe')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme')).toHaveAccessibleName('Switch to light theme');
});

test('actual GLB download validates, contains embedded material images and roundtrips without studio', async ({ page }, testInfo) => {
  await page.locator('#openness').fill('94');
  await page.locator('#width').fill('410');
  await page.locator('#width').press('Tab');
  const original = await snapshot(page);
  const originalBounds = await page.locator('#bounds').textContent();
  const pending = page.waitForEvent('download');
  await page.locator('#export-glb').click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('everyday-box.glb');
  const output = testInfo.outputPath('everyday-box.glb');
  await download.saveAs(output);
  const bytes = await readFile(output);
  const validation = await validateBytes(new Uint8Array(bytes), { uri: 'everyday-box.glb' });
  await testInfo.attach('gltf-validation', { body: JSON.stringify(validation, null, 2), contentType: 'application/json' });
  expect(validation.issues.numErrors, JSON.stringify(validation.issues.messages)).toBe(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const manifest = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))));
  expect(manifest.images.length).toBe(2);
  expect(manifest.images.every((image) => image.bufferView !== undefined && !image.uri)).toBe(true);
  expect(manifest.nodes.some((node) => /Viewer ground|Camera|Light|Grid|selection/i.test(node.name ?? ''))).toBe(false);
  expect(manifest.nodes.some((node) => node.name === 'Front flap hinge')).toBe(true);
  expect(manifest.materials.some((material) => material.pbrMetallicRoughness.baseColorTexture)).toBe(true);
  expect(manifest.extensionsRequired ?? []).toEqual([]);
  await page.locator('#model-file').setInputFiles(output);
  await expect(page.locator('#material-tag')).toHaveText('LOCAL GLB');
  expect((await snapshot(page)).meshes).toBe(original.meshes);
  expect(await page.locator('#bounds').textContent()).toBe(originalBounds);
  await expect(page.locator('#box-controls')).toBeHidden();
  await expect(page.locator('#export-recipe')).toBeDisabled();
  const pendingReexport = page.waitForEvent('download');
  await page.locator('#export-glb').click();
  const reexport = await pendingReexport;
  const second = testInfo.outputPath('roundtrip.glb');
  await reexport.saveAs(second);
  expect((await validateBytes(new Uint8Array(await readFile(second)))).issues.numErrors).toBe(0);
  await mkdir('.local', { recursive: true });
  await download.saveAs('.local\\verified-box.glb');
});

test('invalid file preserves previous model and reports explicit rejection', async ({ page }) => {
  const before = await snapshot(page);
  await page.locator('#model-file').setInputFiles({ name: 'broken.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('not glTF') });
  await expect(page.locator('#status')).toHaveAttribute('data-error', 'true');
  await expect(page.locator('#status')).toContainText('valid');
  expect((await snapshot(page)).recipe).toEqual(before.recipe);
  await expect(page.locator('#export-glb')).toBeEnabled();
  await page.locator('#width').fill('10');
  await page.locator('#width').press('Tab');
  await expect(page.locator('#status')).toContainText('100 and 600');
  await expect(page.locator('#width')).toHaveValue('320');
  expect((await snapshot(page)).meshes).toBe(before.meshes);
});

test('recipe, prompt/reference brief and actual PNG download carry the intended content', async ({ page }, testInfo) => {
  let pending = page.waitForEvent('download');
  await page.locator('#export-recipe').click();
  let download = await pending;
  let output = testInfo.outputPath('recipe.json');
  await download.saveAs(output);
  expect(JSON.parse(await readFile(output, 'utf8'))).toMatchObject({ model: 'cardboard-box', units: 'meters', width: 0.32 });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#references').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#reference-list img')).toHaveCount(1);
  await page.locator('#prompt').fill('An original pale-blue box, width 320 mm, with four movable flaps.');
  pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save brief' }).click();
  download = await pending;
  output = testInfo.outputPath('brief.json');
  await download.saveAs(output);
  const brief = JSON.parse(await readFile(output, 'utf8'));
  expect(brief.prompt).toContain('pale-blue');
  expect(brief.references).toEqual([{ name: 'reference.png', size: png.length, type: 'image/png' }]);
  expect(JSON.stringify(brief)).not.toContain('base64');
  await page.getByRole('button', { name: 'Remove reference.png' }).click();
  await expect(page.locator('#reference-list img')).toHaveCount(0);
  pending = page.waitForEvent('download');
  await page.locator('#snapshot').click();
  download = await pending;
  output = testInfo.outputPath('view.png');
  await download.saveAs(output);
  const image = await readFile(output);
  expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const dimensions = await page.evaluate(async (data) => {
    const image = await createImageBitmap(new Blob([new Uint8Array(data)], { type: 'image/png' }));
    const result = [image.width, image.height]; image.close(); return result;
  }, [...image]);
  expect(dimensions.every((value) => value > 200)).toBe(true);
});

test('phone layout has no horizontal overflow and touch-friendly viewport/help', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#viewport canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const canvas = await page.locator('#viewport canvas').boundingBox();
  expect(canvas.width).toBeGreaterThan(300);
  expect(canvas.height).toBeGreaterThan(300);
  await page.locator('#help-open').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});
