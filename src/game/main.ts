import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

import { createEventQueue, createPipeline } from '../ecs';
import { type Theme } from '../theme';
import { type CollisionEvent } from './types';
import { createEnvironment, type Environment } from './environment';
import { createVisualPipeline } from './visual-pipeline';
import { createGripBindSystem } from './grip-bind-system';
import { createTrailUpdateSystem } from './trail-update-system';
import { createCollisionSystem } from './collision-system';
import { bridgeInput } from './input-bridge';

// ── Theme ──────────────────────────────────────────────────────────

const cyan    = new Color3(0, 0.9, 0.95);
const magenta = new Color3(0.95, 0, 0.7);

const theme: Theme = {
  leftHand:  cyan,
  rightHand: magenta,
};

// ── Bootstrap ──────────────────────────────────────────────────────

function showVersion(): void {
  const el = document.createElement('div');
  el.textContent = 'v3';
  el.style.cssText = 'position:fixed;top:8px;left:8px;color:#fff;font:14px monospace;opacity:0.5;z-index:9999;pointer-events:none';
  document.body.appendChild(el);
}

function createEngine(): Engine {
  const canvas = document.getElementById('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas element not found');
  return new Engine(canvas, true);
}

function createScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  const camera = new FreeCamera('cam', new Vector3(0, 1.6, 0), scene);
  camera.setTarget(new Vector3(0, 1.6, -100));
  camera.attachControl();
  return scene;
}

async function setupWebXR(scene: Scene, env: Environment): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: { sessionMode: 'immersive-vr' },
    disableTeleportation: true,
    disablePointerSelection: true,
    disableNearInteraction: true,
    disableHandTracking: true,
    inputOptions: { doNotLoadControllerMeshes: true },
  });

  const collisionEvents = createEventQueue<CollisionEvent>((_event) => {
    // Future: sparks, haptics, scoring
  });

  const disposeVisuals = createVisualPipeline(theme);

  const tick = createPipeline(
    [
      createGripBindSystem(),
      createTrailUpdateSystem(scene),
      createCollisionSystem((event) => collisionEvents.push(event)),
      env.createBeatDecaySystem(),
    ],
    [collisionEvents],
  );

  const disposeInput = bridgeInput(xr.input);

  // Capture teardowns for future shutdown logic
  void disposeVisuals;
  void disposeInput;

  scene.onBeforeRenderObservable.add(() => tick());
}

async function main(): Promise<void> {
  showVersion();
  const engine = createEngine();
  const scene  = createScene(engine);

  const env = createEnvironment(scene, theme);
  setupWebXR(scene, env).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
