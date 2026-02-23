import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { stateMachine } from './state';

// Renderer setup
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element not found');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;

// Scene and camera
const scene = new THREE.Scene();
scene.background = new THREE.Color().setHSL(0, 0, 0); // Dark void

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 0);

// VR button
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Setup state handlers
stateMachine.on('menu', {
  onEnter: () => {
    console.log('State: menu');
    scene.clear();
  },
  onExit: () => {
    console.log('Exiting: menu');
  },
});

stateMachine.on('countdown', {
  onEnter: () => {
    console.log('State: countdown');
    scene.clear();
  },
  onExit: () => {
    console.log('Exiting: countdown');
  },
});

stateMachine.on('playing', {
  onEnter: () => {
    console.log('State: playing');
    scene.clear();
  },
  onExit: () => {
    console.log('Exiting: playing');
  },
});

stateMachine.on('paused', {
  onEnter: () => {
    console.log('State: paused');
  },
  onExit: () => {
    console.log('Exiting: paused');
  },
});

stateMachine.on('results', {
  onEnter: () => {
    console.log('State: results');
    scene.clear();
  },
  onExit: () => {
    console.log('Exiting: results');
  },
});

// Initialize to menu state
stateMachine.setState('menu');

// Clock for delta time
let lastTime = performance.now();

// XR-compatible render loop
renderer.setAnimationLoop((time, frame) => {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  stateMachine.update(dt);
  renderer.render(scene, camera);
});
