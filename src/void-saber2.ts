/**
 * Void Saber 2 — Full app entry point using ECS.
 * Parallel implementation of main.ts. Swap index.html script src to test.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

import {
  World, type System, type Teardown,
  createEventQueue, createPipeline, onRemoved,
} from './ecs';
import { type Hand, type Theme, isHand, handColor } from './theme';
import { createEnvironment } from './environment';
import { buildSaber, type Saber, BLADE_RADIUS } from './saber/saberBuilder';
import { createTrail, type Trail } from './saber/trail';
import { segmentDistance } from './collision';

// ── Theme ──────────────────────────────────────────────────────────

const cyan    = new Color3(0, 0.9, 0.95);
const magenta = new Color3(0.95, 0, 0.7);

const theme: Theme = {
  leftHand:  cyan,
  rightHand: magenta,
};

// ── Entity ─────────────────────────────────────────────────────────

type Entity = {
  hand?: Hand;
  input?: WebXRInputSource;
  saber?: Saber;
  trail?: Trail;
  gripBound?: true;
};

// ── World + Queries ────────────────────────────────────────────────

const world = new World<Entity>();

const needsSaber   = world.with('hand', 'input').without('saber');
const needsGrip    = world.with('input', 'saber', 'trail').without('gripBound');
const activeSabers = world.with('saber', 'gripBound');
const withSaber    = world.with('saber');
const withTrail    = world.with('trail');

// ── Collision Event ────────────────────────────────────────────────

interface CollisionEvent {
  point: Vector3;
}

const INTERSECT_DIST = BLADE_RADIUS * 2;

// ── Systems ────────────────────────────────────────────────────────

function createSaberSetupSystem(scene: Scene): System {
  return () => {
    for (const entity of needsSaber) {
      const hand  = entity.hand;
      const name  = `saber_${hand}`;
      const color = handColor(theme, hand);
      const saber = buildSaber(name, color);
      const trail = createTrail(name, saber.blade.base, saber.blade.tip, color, scene);

      world.addComponent(entity, 'saber', saber);
      world.addComponent(entity, 'trail', trail);
    }
  };
}

function createGripBindSystem(): System {
  return () => {
    for (const entity of needsGrip) {
      const grip = entity.input.grip;
      if (!grip) continue;

      entity.saber.root.parent = grip;
      entity.trail.start();
      world.addComponent(entity, 'gripBound', true);
    }
  };
}

function createCollisionSystem(
  onCollision: (event: CollisionEvent) => void,
): System {
  return () => {
    if (activeSabers.size < 2) return;

    const entities = activeSabers.entities;
    const a = entities[0].saber.blade;
    const b = entities[1].saber.blade;

    const { dist, point } = segmentDistance(
      a.base.getAbsolutePosition(), a.tip.getAbsolutePosition(),
      b.base.getAbsolutePosition(), b.tip.getAbsolutePosition(),
    );

    if (dist < INTERSECT_DIST) {
      onCollision({ point });
    }
  };
}

// ── Input Bridge ───────────────────────────────────────────────────

function bridgeInput(input: WebXRInput): Teardown {
  const addObs = input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (!isHand(handedness)) return;
    world.add({ hand: handedness, input: source });
  });

  const removeObs = input.onControllerRemovedObservable.add((source) => {
    for (const entity of world) {
      if (entity.input === source) {
        world.remove(entity);
        break;
      }
    }
  });

  return () => {
    input.onControllerAddedObservable.remove(addObs);
    input.onControllerRemovedObservable.remove(removeObs);
  };
}

// ── Disposal ───────────────────────────────────────────────────────

function setupDisposal(): void {
  onRemoved(withSaber, (e) => e.saber.dispose());
  onRemoved(withTrail, (e) => e.trail.dispose());
}

// ── Bootstrap ──────────────────────────────────────────────────────

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

async function setupWebXR(scene: Scene): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: { sessionMode: 'immersive-vr' },
    disableTeleportation: true,
    disablePointerSelection: true,
    disableNearInteraction: true,
    disableHandTracking: true,
    inputOptions: { doNotLoadControllerMeshes: true },
  });

  setupDisposal();

  const collisionEvents = createEventQueue<CollisionEvent>((_event) => {
    // Future: sparks, haptics, scoring
  });

  const tick = createPipeline([
    createSaberSetupSystem(scene),
    createGripBindSystem(),
    createCollisionSystem((event) => collisionEvents.push(event)),
  ]);

  bridgeInput(xr.input);
  scene.onBeforeRenderObservable.add(() => tick());
}

function showVersion(): void {
  const el = document.createElement('div');
  el.textContent = 'v2';
  el.style.cssText = 'position:fixed;top:8px;left:8px;color:#fff;font:14px monospace;opacity:0.5;z-index:9999;pointer-events:none';
  document.body.appendChild(el);
}

async function main(): Promise<void> {
  showVersion();
  const engine = createEngine();
  const scene  = createScene(engine);

  createEnvironment(scene, theme);
  setupWebXR(scene).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
