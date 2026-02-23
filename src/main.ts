import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { stateMachine, type GameState } from './state';
import { COLORS } from './config';

// Renderer setup
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
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
scene.background = COLORS.DARK_VOID;

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 0);

// Lighting
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// VR button
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Setup state callbacks
stateMachine.on('menu', {
  onEnter: () => {
    console.log('Entering menu state');
  },
  onExit: () => {
    console.log('Exiting menu state');
  },
});

stateMachine.on('countdown', {
  onEnter: () => {
    console.log('Entering countdown state');
  },
  onExit: () => {
    console.log('Exiting countdown state');
  },
});

stateMachine.on('playing', {
  onEnter: () => {
    console.log('Entering playing state');
  },
  onExit: () => {
    console.log('Exiting playing state');
  },
});

stateMachine.on('paused', {
  onEnter: () => {
    console.log('Entering paused state');
  },
  onExit: () => {
    console.log('Exiting paused state');
  },
});

stateMachine.on('results', {
  onEnter: () => {
    console.log('Entering results state');
  },
  onExit: () => {
    console.log('Exiting results state');
  },
});

// Test geometry - simple rotating cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: COLORS.CYAN });
const cube = new THREE.Mesh(geometry, material);
cube.position.z = -5;
scene.add(cube);

// Animation loop
renderer.setAnimationLoop((time, frame) => {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
});
