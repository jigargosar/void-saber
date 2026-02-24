import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment } from './scene/environment';
import { XRPassthroughTest } from './shaders/XRPassthroughTest';

// --- Renderer ---
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 0);

// --- Environment ---
createEnvironment(scene);

// --- Desktop Post-processing: Bloom (still works via EffectComposer) ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55, 0.5, 0.25
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// --- XR Passthrough Test ---
const xrPassthrough = new XRPassthroughTest(renderer, scene, camera);

// --- VR Button ---
const vrButton = VRButton.createButton(renderer);
document.getElementById('vr-button-container')!.appendChild(vrButton);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  xrPassthrough.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
renderer.setAnimationLoop(() => {
  if (renderer.xr.isPresenting) {
    // TEST: Scene → RenderTarget → Fullscreen quad → XR framebuffer
    // If this looks correct in both eyes, the plumbing works.
    xrPassthrough.render();
  } else {
    // Desktop: EffectComposer bloom as before
    composer.render();
  }
});
