import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math';
import type { Observer } from '@babylonjs/core/Misc/observable';

const SAMPLE_COUNT = 60;
const FLOATS_PER_SAMPLE = 6;
const EMIT_THRESHOLD = 0.01;
const MAX_AGE = 15;
const SPAWN_ALPHA_TIP = 0.4;
const SPAWN_ALPHA_BASE = 0.05;
const ACCEL_SENSITIVITY = 300;
const FADE_RATE_MIN = 0.5;
const FADE_RATE_MAX = 5.0;

export interface Trail {
  start(): void;
  dispose(): void;
}

export function createTrail(
  name: string,
  bladeBase: TransformNode,
  bladeTip: TransformNode,
  color: Color3,
  scene: Scene,
): Trail {
  const vertexCount = SAMPLE_COUNT * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);
  const ages = new Float32Array(SAMPLE_COUNT).fill(-1);

  // RGB always white — set once, only alpha changes per frame
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 4] = 1;
    colors[i * 4 + 1] = 1;
    colors[i * 4 + 2] = 1;
  }

  const indices: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT - 1; i++) {
    const b0 = i * 2;
    const t0 = i * 2 + 1;
    const b1 = (i + 1) * 2;
    const t1 = (i + 1) * 2 + 1;
    indices.push(b0, t0, t1, b0, t1, b1);
  }

  const mesh = new Mesh(`${name}Trail`, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh, true);
  mesh.hasVertexAlpha = true;
  mesh.alwaysSelectAsActiveMesh = true;

  const mat = new StandardMaterial(`${name}TrailMat`, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mesh.material = mat;

  mesh.setEnabled(false);

  let observer: Observer<Scene> | null = null;
  let prevSpeed = 0;
  const LIVE = SAMPLE_COUNT - 1;
  const LIVE_OFFSET = LIVE * FLOATS_PER_SAMPLE;

  function start(): void {
    const bp = bladeBase.getAbsolutePosition();
    const tp = bladeTip.getAbsolutePosition();

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const offset = i * FLOATS_PER_SAMPLE;
      positions[offset]     = bp.x;
      positions[offset + 1] = bp.y;
      positions[offset + 2] = bp.z;
      positions[offset + 3] = tp.x;
      positions[offset + 4] = tp.y;
      positions[offset + 5] = tp.z;
      ages[i] = -1;
      colors[i * 2 * 4 + 3] = 0;
      colors[(i * 2 + 1) * 4 + 3] = 0;
    }
    ages[LIVE] = 0;
    prevSpeed = 0;

    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.updateVerticesData(VertexBuffer.ColorKind, colors);
    mesh.setEnabled(true);

    observer = scene.onBeforeRenderObservable.add(() => {
      const bp = bladeBase.getAbsolutePosition();
      const tp = bladeTip.getAbsolutePosition();

      const dx = tp.x - positions[LIVE_OFFSET + 3];
      const dy = tp.y - positions[LIVE_OFFSET + 4];
      const dz = tp.z - positions[LIVE_OFFSET + 5];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > EMIT_THRESHOLD) {
        positions.copyWithin(0, FLOATS_PER_SAMPLE);
        ages.copyWithin(0, 1);
        ages[LIVE] = 0;
      }

      positions[LIVE_OFFSET]     = bp.x;
      positions[LIVE_OFFSET + 1] = bp.y;
      positions[LIVE_OFFSET + 2] = bp.z;
      positions[LIVE_OFFSET + 3] = tp.x;
      positions[LIVE_OFFSET + 4] = tp.y;
      positions[LIVE_OFFSET + 5] = tp.z;

      const accel = dist - prevSpeed;
      const fadeRate = Math.max(FADE_RATE_MIN, Math.min(FADE_RATE_MAX, 1 + accel * ACCEL_SENSITIVITY));
      prevSpeed = dist;

      // Age and compute alpha in one pass (skip live sample at end)
      for (let i = 0; i < LIVE; i++) {
        let tipAlpha = 0;
        let baseAlpha = 0;
        if (ages[i] >= 0) {
          ages[i] += fadeRate;
          const t = ages[i] / MAX_AGE;
          if (t < 1) {
            tipAlpha = SPAWN_ALPHA_TIP * (1 - t);
            baseAlpha = SPAWN_ALPHA_BASE * (1 - t);
          }
        }
        colors[i * 2 * 4 + 3] = baseAlpha;
        colors[(i * 2 + 1) * 4 + 3] = tipAlpha;
      }
      // Live sample: always transparent
      colors[LIVE * 2 * 4 + 3] = 0;
      colors[(LIVE * 2 + 1) * 4 + 3] = 0;

      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      mesh.updateVerticesData(VertexBuffer.ColorKind, colors);
    });
  }

  function dispose(): void {
    if (observer) {
      scene.onBeforeRenderObservable.remove(observer);
      observer = null;
    }
    mesh.dispose();
  }

  return { start, dispose };
}
