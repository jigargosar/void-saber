/**
 * Void Saber 2 — Full ECS-based game.
 * Only imports: ecs.ts (framework), theme.ts + collision.ts (pure utilities), Babylon.js (library).
 * All stateful game logic (environment, sabers, trails) rebuilt as entities/components/systems.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

import {
  World, type System, type Teardown,
  onEnter, onExit,
  createEventQueue, createPipeline,
} from './ecs';
import { type Hand, type Theme, isHand, handColor } from './theme';
import { segmentDistance } from './collision';

// ── Constants ──────────────────────────────────────────────────────

const BLADE_HEIGHT  = 1.0;
const BLADE_RADIUS  = 0.02;
const HANDLE_HEIGHT = 0.2;
const HANDLE_RADIUS = 0.03;
const INTERSECT_DIST = BLADE_RADIUS * 2;

const DARK_STEEL  = new Color3(0.35, 0.35, 0.4);
const LIGHT_STEEL = new Color3(0.4, 0.4, 0.4);

const BG = new Color3(0.01, 0.01, 0.03);
const FOG_BASE     = 0.04;
const PILLAR_COUNT = 14;
const PILLAR_GAP   = 6;
const PILLAR_X     = 6;
const TRACK_HALF   = 100;
const RIB_COUNT    = 20;
const RIB_GAP      = 10;

const TRAIL_SAMPLE_COUNT   = 60;
const TRAIL_FLOATS_PER_SAMPLE = 6;
const TRAIL_EMIT_THRESHOLD = 0.01;
const TRAIL_MAX_AGE        = 15;
const TRAIL_SPAWN_ALPHA_TIP  = 0.4;
const TRAIL_SPAWN_ALPHA_BASE = 0.05;
const TRAIL_ACCEL_SENSITIVITY = 300;
const TRAIL_FADE_RATE_MIN  = 0.5;
const TRAIL_FADE_RATE_MAX  = 5.0;

// ── Theme ──────────────────────────────────────────────────────────

const cyan    = new Color3(0, 0.9, 0.95);
const magenta = new Color3(0.95, 0, 0.7);

const theme: Theme = {
  leftHand:  cyan,
  rightHand: magenta,
};

// ── Component Interfaces ──────────────────────────────────────────

interface BladeSegment {
  readonly base: TransformNode;
  readonly tip: TransformNode;
}

interface SaberVisual {
  readonly root: TransformNode;
  readonly blade: BladeSegment;
}

interface TrailBuffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly ages: Float32Array;
  prevSpeed: number;
  started: boolean;
}

interface TrailBundle {
  readonly mesh: Mesh;
  readonly buffers: TrailBuffers;
}

interface CollisionEvent {
  readonly point: Vector3;
}

// ── Entity ─────────────────────────────────────────────────────────

type Entity = {
  hand?: Hand;
  input?: WebXRInputSource;
  saber?: SaberVisual;
  trailMesh?: Mesh;
  trailBuffers?: TrailBuffers;
  gripBound?: true;
};

// ── World + Queries ────────────────────────────────────────────────

const world = new World<Entity>();

// Lifecycle hooks
const controllers = world.with('hand', 'input');

// Per-frame systems
const needsGrip    = world.with('input', 'saber', 'trailBuffers', 'trailMesh').without('gripBound');
const activeTrails = world.with('saber', 'trailBuffers', 'trailMesh', 'gripBound');
const activeSabers = world.with('saber', 'gripBound');

// ── Saber Construction ─────────────────────────────────────────────

function buildSaber(name: string, color: Color3): SaberVisual {
  const root = new TransformNode(name);
  root.rotation.x = Math.PI / 2;

  // Handle
  const handleMat = new StandardMaterial(`${name}HandleMat`);
  handleMat.diffuseColor = DARK_STEEL;
  handleMat.specularColor = LIGHT_STEEL;
  const handle = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT, diameter: HANDLE_RADIUS * 2, tessellation: 12,
  });
  handle.material = handleMat;
  handle.position.y = HANDLE_HEIGHT / 2;
  handle.parent = root;

  // Blade
  const bladeMat = new StandardMaterial(`${name}BladeMat`);
  bladeMat.emissiveColor = color;
  bladeMat.disableLighting = true;
  const bladeMesh = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT, diameter: BLADE_RADIUS * 2, tessellation: 12,
  });
  bladeMesh.material = bladeMat;
  bladeMesh.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  bladeMesh.parent = root;

  // Blade segment (collision endpoints)
  const base = new TransformNode(`${name}BladeBase`);
  base.position.y = HANDLE_HEIGHT;
  base.parent = root;

  const tip = new TransformNode(`${name}BladeTip`);
  tip.position.y = HANDLE_HEIGHT + BLADE_HEIGHT;
  tip.parent = root;

  return { root, blade: { base, tip } };
}

// ── Trail Construction ─────────────────────────────────────────────

function buildTrail(name: string, color: Color3): TrailBundle {
  const vertexCount = TRAIL_SAMPLE_COUNT * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);
  const ages = new Float32Array(TRAIL_SAMPLE_COUNT).fill(-1);

  for (let i = 0; i < vertexCount; i++) {
    colors[i * 4]     = 1;
    colors[i * 4 + 1] = 1;
    colors[i * 4 + 2] = 1;
  }

  const indices: number[] = [];
  for (let i = 0; i < TRAIL_SAMPLE_COUNT - 1; i++) {
    const b0 = i * 2;
    const t0 = i * 2 + 1;
    const b1 = (i + 1) * 2;
    const t1 = (i + 1) * 2 + 1;
    indices.push(b0, t0, t1, b0, t1, b1);
  }

  const mesh = new Mesh(`${name}Trail`);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh, true);
  mesh.hasVertexAlpha = true;
  mesh.alwaysSelectAsActiveMesh = true;

  const mat = new StandardMaterial(`${name}TrailMat`);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mesh.material = mat;

  mesh.setEnabled(false);

  return { mesh, buffers: { positions, colors, ages, prevSpeed: 0, started: false } };
}

function startTrail(buffers: TrailBuffers, mesh: Mesh, blade: BladeSegment): void {
  const bp = blade.base.getAbsolutePosition();
  const tp = blade.tip.getAbsolutePosition();

  for (let i = 0; i < TRAIL_SAMPLE_COUNT; i++) {
    const offset = i * TRAIL_FLOATS_PER_SAMPLE;
    buffers.positions[offset]     = bp.x;
    buffers.positions[offset + 1] = bp.y;
    buffers.positions[offset + 2] = bp.z;
    buffers.positions[offset + 3] = tp.x;
    buffers.positions[offset + 4] = tp.y;
    buffers.positions[offset + 5] = tp.z;
    buffers.ages[i] = -1;
    buffers.colors[i * 2 * 4 + 3] = 0;
    buffers.colors[(i * 2 + 1) * 4 + 3] = 0;
  }
  buffers.ages[TRAIL_SAMPLE_COUNT - 1] = 0;
  buffers.prevSpeed = 0;
  buffers.started = true;

  mesh.updateVerticesData(VertexBuffer.PositionKind, buffers.positions);
  mesh.updateVerticesData(VertexBuffer.ColorKind, buffers.colors);
  mesh.setEnabled(true);
}

// ── Visual Pipeline — onEnter / onExit ────────────────────────────

function createVisualPipeline(): Teardown {
  const teardowns: Teardown[] = [];

  teardowns.push(onEnter(controllers, (entity) => {
    const name = `saber_${entity.hand}`;
    const color = handColor(theme, entity.hand);

    const saber = buildSaber(name, color);
    const trail = buildTrail(name, color);

    world.update(entity, {
      saber,
      trailMesh: trail.mesh,
      trailBuffers: trail.buffers,
    });
  }));

  teardowns.push(onExit(controllers, (entity) => {
    if (entity.saber) entity.saber.root.dispose(false, true);
    if (entity.trailMesh) entity.trailMesh.dispose(false, true);
  }));

  return () => { for (const td of teardowns) td(); };
}

// ── Systems ────────────────────────────────────────────────────────

function createGripBindSystem(): System {
  return () => {
    for (const entity of needsGrip) {
      const grip = entity.input.grip;
      if (!grip) continue;
      entity.saber.root.parent = grip;
      startTrail(entity.trailBuffers, entity.trailMesh, entity.saber.blade);
      world.addComponent(entity, 'gripBound', true);
    }
  };
}

function createTrailUpdateSystem(scene: Scene): System {
  const LIVE = TRAIL_SAMPLE_COUNT - 1;
  const LIVE_OFFSET = LIVE * TRAIL_FLOATS_PER_SAMPLE;
  const engine = scene.getEngine();

  return () => {
    const dt = engine.getDeltaTime() / 1000;

    for (const entity of activeTrails) {
      const buffers = entity.trailBuffers;
      if (!buffers.started) continue;

      const bp = entity.saber.blade.base.getAbsolutePosition();
      const tp = entity.saber.blade.tip.getAbsolutePosition();

      const dx = tp.x - buffers.positions[LIVE_OFFSET + 3];
      const dy = tp.y - buffers.positions[LIVE_OFFSET + 4];
      const dz = tp.z - buffers.positions[LIVE_OFFSET + 5];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > TRAIL_EMIT_THRESHOLD) {
        buffers.positions.copyWithin(0, TRAIL_FLOATS_PER_SAMPLE);
        buffers.ages.copyWithin(0, 1);
        buffers.ages[LIVE] = 0;
      }

      buffers.positions[LIVE_OFFSET]     = bp.x;
      buffers.positions[LIVE_OFFSET + 1] = bp.y;
      buffers.positions[LIVE_OFFSET + 2] = bp.z;
      buffers.positions[LIVE_OFFSET + 3] = tp.x;
      buffers.positions[LIVE_OFFSET + 4] = tp.y;
      buffers.positions[LIVE_OFFSET + 5] = tp.z;

      const accel = dist - buffers.prevSpeed;
      const fadeRate = Math.max(TRAIL_FADE_RATE_MIN, Math.min(TRAIL_FADE_RATE_MAX, 1 + accel * TRAIL_ACCEL_SENSITIVITY));
      buffers.prevSpeed = dist;

      for (let i = 0; i < LIVE; i++) {
        let tipAlpha = 0;
        let baseAlpha = 0;
        if (buffers.ages[i] >= 0) {
          buffers.ages[i] += fadeRate * dt * 60;
          const t = buffers.ages[i] / TRAIL_MAX_AGE;
          if (t < 1) {
            tipAlpha = TRAIL_SPAWN_ALPHA_TIP * (1 - t);
            baseAlpha = TRAIL_SPAWN_ALPHA_BASE * (1 - t);
          }
        }
        buffers.colors[i * 2 * 4 + 3] = baseAlpha;
        buffers.colors[(i * 2 + 1) * 4 + 3] = tipAlpha;
      }
      buffers.colors[LIVE * 2 * 4 + 3] = 0;
      buffers.colors[(LIVE * 2 + 1) * 4 + 3] = 0;

      entity.trailMesh.updateVerticesData(VertexBuffer.PositionKind, buffers.positions);
      entity.trailMesh.updateVerticesData(VertexBuffer.ColorKind, buffers.colors);
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

// ── Environment ────────────────────────────────────────────────────

interface PillarSnapshot {
  readonly mat: StandardMaterial;
  readonly baseColor: Color3;
}

interface Environment {
  onBeat(): void;
  dispose(): void;
  createBeatDecaySystem(): System;
}

function createEnvironment(scene: Scene): Environment {
  // Atmosphere
  scene.clearColor = new Color4(BG.r, BG.g, BG.b, 1);
  scene.fogMode    = Scene.FOGMODE_EXP2;
  scene.fogDensity = FOG_BASE;
  scene.fogColor   = BG;

  // Lighting
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0));
  hemi.intensity = 0.08;

  const glow = new GlowLayer('glow', scene, { mainTextureSamples: 4, blurKernelSize: 64 });
  glow.intensity = 1.08;
  glow.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
    if (mesh.name.endsWith('Trail')) {
      result.set(0, 0, 0, 0);
      return;
    }
    if (mesh.material instanceof StandardMaterial) {
      const ec = mesh.material.emissiveColor;
      result.set(ec.r, ec.g, ec.b, 1);
    } else {
      result.set(0, 0, 0, 0);
    }
  };

  // Track
  const track = MeshBuilder.CreateGround('track', { width: 4, height: TRACK_HALF * 2 });
  const trackMat = new StandardMaterial('trackMat');
  trackMat.diffuseColor = new Color3(0.02, 0.02, 0.03);
  trackMat.specularColor = Color3.Black();
  track.material = trackMat;

  const edgeMatL = new StandardMaterial('edgeLeft');
  edgeMatL.emissiveColor = Color3.White();
  edgeMatL.disableLighting = true;

  const edgeMatR = new StandardMaterial('edgeRight');
  edgeMatR.emissiveColor = Color3.White();
  edgeMatR.disableLighting = true;

  const edgeL = MeshBuilder.CreateBox('edgeL', { width: 0.03, height: 0.02, depth: TRACK_HALF * 2 });
  edgeL.position.set(-2, 0.01, 0);
  edgeL.material = edgeMatL;

  const edgeR = MeshBuilder.CreateBox('edgeR', { width: 0.03, height: 0.02, depth: TRACK_HALF * 2 });
  edgeR.position.set(2, 0.01, 0);
  edgeR.material = edgeMatR;

  // Floor ribs
  const ribStart = Math.floor(RIB_COUNT / 2) * RIB_GAP;
  const ribMatL = new StandardMaterial('ribLeft');
  ribMatL.emissiveColor = theme.leftHand.scale(0.4);
  ribMatL.disableLighting = true;
  const ribMatR = new StandardMaterial('ribRight');
  ribMatR.emissiveColor = theme.rightHand.scale(0.4);
  ribMatR.disableLighting = true;

  for (let i = 0; i < RIB_COUNT; i++) {
    const z   = ribStart - i * RIB_GAP;
    const mat = i % 2 === 0 ? ribMatL : ribMatR;
    const rib = MeshBuilder.CreateCylinder(`rib${i}`, {
      height: 4, diameter: 0.03, tessellation: 8,
    });
    rib.rotation.z = Math.PI / 2;
    rib.position.set(0, -0.04, z);
    rib.material = mat;
  }

  // Pillars
  const pillarSnapshots: PillarSnapshot[] = [];
  const pillarStart = Math.floor(PILLAR_COUNT / 2) * PILLAR_GAP;

  for (let i = 0; i < PILLAR_COUNT; i++) {
    const z = pillarStart - i * PILLAR_GAP;

    const mL = new StandardMaterial(`pillarMatL${i}`);
    mL.emissiveColor = new Color3(0.4, 0, 0.6);
    mL.disableLighting = true;
    const pL = MeshBuilder.CreateCylinder(`pillarL${i}`, { height: 8, diameter: 0.12, tessellation: 12 });
    pL.position.set(PILLAR_X, 2, z);
    pL.material = mL;
    pillarSnapshots.push({ mat: mL, baseColor: mL.emissiveColor.clone() });

    const mR = new StandardMaterial(`pillarMatR${i}`);
    mR.emissiveColor = new Color3(0.4, 0, 0.6);
    mR.disableLighting = true;
    const pR = MeshBuilder.CreateCylinder(`pillarR${i}`, { height: 8, diameter: 0.12, tessellation: 12 });
    pR.position.set(-PILLAR_X, 2, z);
    pR.material = mR;
    pillarSnapshots.push({ mat: mR, baseColor: mR.emissiveColor.clone() });

    if (i < 2) {
      const lL = new PointLight(`pointL${i}`, new Vector3(-PILLAR_X, 0.5, z));
      lL.diffuse = theme.leftHand;
      lL.intensity = 0.5;
      lL.range = 4;

      const lR = new PointLight(`pointR${i}`, new Vector3(PILLAR_X, 0.5, z));
      lR.diffuse = theme.rightHand;
      lR.intensity = 0.5;
      lR.range = 4;
    }
  }

  // Beat flash state — closed over, not module-level
  let beatFlash = 0;

  function onBeat(): void {
    beatFlash = 1;
  }

  function createBeatDecaySystem(): System {
    const engine = scene.getEngine();
    return () => {
      if (beatFlash <= 0) return;
      const dt = engine.getDeltaTime() / 1000;
      const t = Math.max(0, beatFlash - dt / 0.12);
      beatFlash = t;
      scene.fogDensity = FOG_BASE * (1 + 0.8 * t);
      for (const { mat, baseColor } of pillarSnapshots) {
        mat.emissiveColor = baseColor.scale(1 + 1.5 * t);
      }
    };
  }

  function dispose(): void {
    glow.dispose();
  }

  return { onBeat, dispose, createBeatDecaySystem };
}

// ── Input Bridge ───────────────────────────────────────────────────

function bridgeInput(input: WebXRDefaultExperience['input']): Teardown {
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

// ── Bootstrap ──────────────────────────────────────────────────────

function showVersion(): void {
  const el = document.createElement('div');
  el.textContent = 'v2';
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

  const disposeVisuals = createVisualPipeline();

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

  const env = createEnvironment(scene);
  setupWebXR(scene, env).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
