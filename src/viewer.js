import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeModel, inspectModel } from './model-io.js';

const directions = {
  iso: [1, 0.75, 1.15], front: [0, 0, 1], back: [0, 0, -1],
  right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001],
};

export class Viewer {
  constructor(container, onSelect, onError) {
    this.container = container;
    this.onSelect = onSelect;
    this.onError = onError;
    this.frame = null;
    this.lastTime = 0;
    this.disposed = false;
    this.suspended = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Rendered 3D model');
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.autoRotateSpeed = 1;
    this.controls.minPolarAngle = 0.001;
    this.controls.maxPolarAngle = Math.PI - 0.001;
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => this.requestRender());
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = this.pmrem.fromScene(room, 0.04);
    disposeModel(room);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.42;
    this.lights = new THREE.Group();
    this.scene.add(this.lights);
    this.key = new THREE.DirectionalLight('#fff8e9', 3.2);
    this.key.position.set(1.6, 2.4, 1.8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.normalBias = 0.0005;
    this.key.shadow.bias = -0.0001;
    this.fill = new THREE.DirectionalLight('#d8e2ff', 1.2);
    this.fill.position.set(-2, 1.1, 0.5);
    this.rim = new THREE.DirectionalLight('#ffffff', 1.5);
    this.rim.position.set(0.5, 1.5, -2);
    this.lights.add(this.key, this.key.target, this.fill, this.fill.target, this.rim, this.rim.target);
    this.hemisphere = new THREE.HemisphereLight('#fff9ec', '#8e8a9e', 0.8);
    this.scene.add(this.hemisphere);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: '#484039', opacity: 0.16 }));
    this.ground.name = 'Viewer ground - not exported';
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.grid = new THREE.GridHelper(1, 20, '#a5a095', '#bfb9ae');
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.24;
    this.scene.add(this.ground, this.grid);
    this.selectionBox = new THREE.Box3Helper(new THREE.Box3(), '#8a6bec');
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);
    this.raycaster = new THREE.Raycaster();
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    container.addEventListener('keydown', (event) => this.onKey(event), options);
    this.renderer.domElement.addEventListener('pointerdown', (event) => { this.pointerStart = { x: event.clientX, y: event.clientY, button: event.button }; }, options);
    this.renderer.domElement.addEventListener('pointerup', (event) => this.pick(event), options);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.suspended = true;
      this.onError(new Error('The graphics context was lost. Reload the page to restore the workspace; downloaded files are safe.'));
    }, options);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.frame !== null) { cancelAnimationFrame(this.frame); this.frame = null; }
      if (!document.hidden) { this.lastTime = 0; this.requestRender(); }
    }, options);
    this.resize();
  }

  requestRender() {
    if (this.frame !== null || this.disposed || this.suspended || document.hidden) return;
    this.frame = requestAnimationFrame((time) => {
      this.frame = null;
      const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0;
      this.lastTime = time;
      const changed = this.controls.update(delta);
      if (this.selected) this.selectionBox.box.setFromObject(this.selected, true);
      this.renderer.render(this.scene, this.camera);
      if (changed || this.controls.autoRotate) this.requestRender();
    });
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.root && this.previousAspect && Math.abs(this.previousAspect - this.camera.aspect) > 0.4) this.fit();
    this.previousAspect = this.camera.aspect;
    this.requestRender();
  }

  setModel(root, parts) {
    const info = inspectModel(root);
    const previous = this.root;
    this.clearSelection();
    this.root = root;
    this.parts = parts;
    this.scene.add(root);
    this.updateBounds(info);
    this.fit('iso');
    if (previous) disposeModel(previous);
    return info;
  }

  updateBounds(info = inspectModel(this.root)) {
    this.info = info;
    const radius = info.size.length() / 2;
    const center = info.box.getCenter(new THREE.Vector3());
    this.ground.scale.setScalar(radius * 12);
    this.ground.position.set(center.x, info.box.min.y - radius * 0.008, center.z);
    this.grid.scale.setScalar(radius * 8);
    this.grid.position.copy(this.ground.position);
    this.grid.position.y += radius * 0.001;
    this.lights.position.copy(center);
    this.lights.scale.setScalar(radius * 2);
    Object.assign(this.key.shadow.camera, { left: -radius * 3, right: radius * 3, top: radius * 3, bottom: -radius * 3, near: Math.max(0.001, radius * 0.05), far: radius * 15 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.key.shadow.normalBias = radius * 0.003;
    this.requestRender();
    return info;
  }

  fit(view) {
    if (!this.root) return;
    const { box, size } = inspectModel(this.root);
    const center = box.getCenter(new THREE.Vector3());
    const direction = view ? new THREE.Vector3(...directions[view]) : this.camera.position.clone().sub(this.controls.target);
    if (!direction.lengthSq()) direction.set(1, 0.75, 1);
    const radius = size.length() / 2;
    const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfAngle = Math.min(vertical, Math.atan(Math.tan(vertical) * this.camera.aspect));
    const distance = radius / Math.sin(halfAngle) * 1.13;
    this.camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
    this.camera.near = Math.max(radius / 1000, 0.00001);
    this.camera.far = Math.max(distance + radius * 80, 10);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.minDistance = radius * 0.12;
    this.controls.maxDistance = radius * 35;
    this.controls.update();
    this.requestRender();
  }

  select(part) {
    this.selected = part;
    this.selectionBox.visible = Boolean(part);
    if (part) this.selectionBox.box.setFromObject(part, true);
    this.onSelect(part);
    this.requestRender();
  }

  clearSelection() { this.select(null); }

  pick(event) {
    if (!this.root || this.pointerStart?.button !== 0 || Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const hit = this.raycaster.intersectObject(this.root, true)[0];
    let part = hit?.object;
    while (part && !this.parts.includes(part)) part = part.parent;
    this.select(part ?? null);
  }

  setWireframe(enabled) {
    this.root?.traverse((node) => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.wireframe = enabled;
    });
    this.requestRender();
  }

  setLight(preset) {
    const colors = { studio: ['#fff8e9', '#d8e2ff', 1.15], warm: ['#ffd4a2', '#f4e3cd', 1.1], cool: ['#d4e5ff', '#e3dcff', 1.15] }[preset];
    if (!colors) throw new Error('Unknown studio lighting preset.');
    this.key.color.set(colors[0]);
    this.fill.color.set(colors[1]);
    this.renderer.toneMappingExposure = colors[2];
    this.requestRender();
  }

  onKey(event) {
    if (event.target !== this.container) return;
    const step = Math.PI / 24;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const actions = {
      ArrowLeft: () => { spherical.theta -= step; }, ArrowRight: () => { spherical.theta += step; },
      ArrowUp: () => { spherical.phi -= step; }, ArrowDown: () => { spherical.phi += step; },
      '+': () => { spherical.radius *= 0.88; }, '=': () => { spherical.radius *= 0.88; },
      '-': () => { spherical.radius *= 1.14; },
    };
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); this.fit(); return; }
    if (!Object.hasOwn(actions, event.key)) return;
    event.preventDefault();
    actions[event.key]();
    spherical.makeSafe();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    this.controls.update();
    this.requestRender();
  }

  async capture() {
    this.renderer.render(this.scene, this.camera);
    const blob = await new Promise((resolve) => this.renderer.domElement.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The viewport could not be captured.');
    return blob;
  }

  dispose() {
    this.disposed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    if (this.root) disposeModel(this.root);
    disposeModel(this.scene);
    this.environment.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
