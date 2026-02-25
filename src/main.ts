/**
 * Void Saber — main entry point
 * Babylon.js + WebXR
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

import { Theme } from './theme';
import { createEnvironment } from './environment';
import { createSaberManager } from './saber/saberManager';

const cyan    = new Color3(0, 0.9, 0.95);
const magenta = new Color3(0.95, 0, 0.7);

const theme: Theme = {
  leftHand:  cyan,
  rightHand: magenta,
};

function createEngine(): Engine {
  const canvas = document.getElementById('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas element not found');
  return new Engine(canvas, /* antialias */ true);
}

function createScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  const camera = new FreeCamera('cam', new Vector3(0, 1.6, 0), scene);
  camera.setTarget(new Vector3(0, 1.6, -100));
  camera.attachControl();
  return scene;
}

async function setupWebXR(scene: Scene): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: { sessionMode: 'immersive-vr' },
    disableTeleportation: true,
    disablePointerSelection: true,
    disableNearInteraction: true,
    disableHandTracking: true,
    inputOptions: { doNotLoadControllerMeshes: true },
  });
  createSaberManager(scene, xr.input, theme);
  console.log('WebXR ready');
}

async function main(): Promise<void> {
  const engine = createEngine();
  const scene  = createScene(engine);

  createEnvironment(scene, theme);
  setupWebXR(scene).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
