import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// --- Renderer ---

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- Scene ---

const scene = new THREE.Scene();
scene.background = new THREE.Color().setHSL(240 / 360, 0.2, 0.05);
scene.fog = new THREE.FogExp2(new THREE.Color().setHSL(240 / 360, 0.2, 0.05), 0.04);

// --- Camera ---

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 0);

// --- Lights ---

const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

const cyanHsl = { h: 185 / 360, s: 1.0, l: 0.55 };
const magentaHsl = { h: 310 / 360, s: 1.0, l: 0.6 };

const cyanLight = new THREE.PointLight(new THREE.Color().setHSL(cyanHsl.h, cyanHsl.s, cyanHsl.l), 4, 30);
cyanLight.position.set(-3, 3, -8);
scene.add(cyanLight);

const magentaLight = new THREE.PointLight(new THREE.Color().setHSL(magentaHsl.h, magentaHsl.s, magentaHsl.l), 4, 30);
magentaLight.position.set(3, 3, -8);
scene.add(magentaLight);

// --- Ground reference ---

const gridHelper = new THREE.GridHelper(40, 40,
  new THREE.Color().setHSL(cyanHsl.h, cyanHsl.s, 0.15),
  new THREE.Color().setHSL(cyanHsl.h, cyanHsl.s, 0.07),
);
scene.add(gridHelper);

// --- VR Button ---

const vrButton = VRButton.createButton(renderer);
document.getElementById('vr-button-container')!.appendChild(vrButton);

// --- Resize ---

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---

renderer.setAnimationLoop((_time, _frame) => {
  renderer.render(scene, camera);
});
