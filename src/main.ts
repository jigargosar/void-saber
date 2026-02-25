/**
 * Void Saber — main entry point
 * Babylon.js + WebXR
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { WebXRExperienceHelper } from '@babylonjs/core/XR/webXRExperienceHelper';
import { WebXREnterExitUI } from '@babylonjs/core/XR/webXREnterExitUI';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

import { createEnvironment } from './environment';

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
  const xrHelper = await WebXRExperienceHelper.CreateAsync(scene);
  await WebXREnterExitUI.CreateAsync(scene, xrHelper, { sessionMode: 'immersive-vr' });
  console.log('WebXR ready');
}

async function main(): Promise<void> {
  const engine = createEngine();
  const scene  = createScene(engine);

  createEnvironment(scene);
  setupWebXR(scene).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
