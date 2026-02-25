import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math';
import type { Observer } from '@babylonjs/core/Misc/observable';

const SAMPLE_COUNT = 60;
const FLOATS_PER_SAMPLE = 6; // 2 vertices (base + tip) × 3 components
const EMIT_THRESHOLD = 0.01; // world units — emit when tip moves this far
const MAX_AGE = 15;          // frames until sample fully fades out
const SPAWN_ALPHA_TIP = 0.4;   // tip spawns brighter
const SPAWN_ALPHA_BASE = 0.0;  // base fully transparent

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
  const ages = new Float32Array(SAMPLE_COUNT).fill(-1); // -1 = inactive

  // Quad-strip indices
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
  let prevSpeed = 0; // last frame's tip movement distance
  const LIVE = SAMPLE_COUNT - 1;
  const LIVE_OFFSET = LIVE * FLOATS_PER_SAMPLE;

  function start(): void {
    const bp = bladeBase.getAbsolutePosition();
    const tp = bladeTip.getAbsolutePosition();

    // All samples collapsed at blade, all inactive
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const offset = i * FLOATS_PER_SAMPLE;
      positions[offset]     = bp.x;
      positions[offset + 1] = bp.y;
      positions[offset + 2] = bp.z;
      positions[offset + 3] = tp.x;
      positions[offset + 4] = tp.y;
      positions[offset + 5] = tp.z;
      ages[i] = -1;
    }
    ages[LIVE] = 0; // live sample tracks blade
    colors.fill(0);

    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.updateVerticesData(VertexBuffer.ColorKind, colors);
    mesh.setEnabled(true);

    observer = scene.onBeforeRenderObservable.add(() => {
      const bp = bladeBase.getAbsolutePosition();
      const tp = bladeTip.getAbsolutePosition();

      // Distance from live sample's last tip position to current tip
      const dx = tp.x - positions[LIVE_OFFSET + 3];
      const dy = tp.y - positions[LIVE_OFFSET + 4];
      const dz = tp.z - positions[LIVE_OFFSET + 5];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Emit one sample per frame at actual controller position (preserves arc)
      if (dist > EMIT_THRESHOLD) {
        positions.copyWithin(0, FLOATS_PER_SAMPLE);
        ages.copyWithin(0, 1);
        ages[LIVE] = 0;
      }

      // Live sample always tracks the blade
      positions[LIVE_OFFSET]     = bp.x;
      positions[LIVE_OFFSET + 1] = bp.y;
      positions[LIVE_OFFSET + 2] = bp.z;
      positions[LIVE_OFFSET + 3] = tp.x;
      positions[LIVE_OFFSET + 4] = tp.y;
      positions[LIVE_OFFSET + 5] = tp.z;

      // Acceleration-driven fade rate
      // accelerating → fade faster (trail thin/sharp)
      // decelerating → fade slower (trail lingers/blooms)
      const accel = dist - prevSpeed;
      const fadeRate = Math.max(0.5, Math.min(5.0, 1 + accel * 300));
      prevSpeed = dist;

      // Age all released samples (not the live one at the end)
      for (let i = 0; i < LIVE; i++) {
        if (ages[i] >= 0) ages[i] += fadeRate;
      }

      // Compute vertex colors: both fade linearly, base starts dimmer
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        let tipAlpha = 0;
        let baseAlpha = 0;
        if (ages[i] > 0) {
          const t = ages[i] / MAX_AGE;
          if (t < 1) {
            tipAlpha = SPAWN_ALPHA_TIP * (1 - t);
            baseAlpha = SPAWN_ALPHA_BASE * (1 - t);
          }
        }

        const bi = i * 2 * 4;
        colors[bi] = 1; colors[bi + 1] = 1; colors[bi + 2] = 1; colors[bi + 3] = baseAlpha;

        const ti = (i * 2 + 1) * 4;
        colors[ti] = 1; colors[ti + 1] = 1; colors[ti + 2] = 1; colors[ti + 3] = tipAlpha;
      }

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
