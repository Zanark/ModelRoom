import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';

export function createPaperTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable; paper textures could not be created.');
  ctx.fillStyle = '#e9e3d8';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 41;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 8500; i++) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,.19)' : 'rgba(63,45,20,.055)';
    ctx.fillRect(random() * 256, random() * 256, 0.4 + random(), 0.3 + random() * 2);
  }
  const paper = new CanvasTexture(canvas);
  paper.name = 'Deterministic paper fibers';
  paper.colorSpace = SRGBColorSpace;
  paper.wrapS = paper.wrapT = RepeatWrapping;
  paper.repeat.set(2, 2);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const labelCtx = labelCanvas.getContext('2d');
  if (!labelCtx) throw new Error('Canvas 2D is unavailable; the label could not be created.');
  labelCtx.fillStyle = '#f6f1e4';
  labelCtx.fillRect(0, 0, 512, 256);
  labelCtx.fillStyle = '#45433d';
  labelCtx.font = 'bold 43px sans-serif';
  labelCtx.fillText('a little possibility.', 27, 62);
  labelCtx.font = '16px monospace';
  labelCtx.fillText('MODEL ROOM / STUDY 001', 28, 96);
  labelCtx.fillText('HANDLE WITH CURIOSITY', 28, 125);
  for (let i = 0; i < 65; i++) {
    if ((i * 13 + 7) % 5 > 1) labelCtx.fillRect(29 + i * 5, 160, i % 3 === 0 ? 3 : 2, 48);
  }
  labelCtx.font = 'bold 51px sans-serif';
  labelCtx.fillText('01', 401, 204);
  const label = new CanvasTexture(labelCanvas);
  label.name = 'Original Model Room label';
  label.colorSpace = SRGBColorSpace;
  return { paper, label };
}
