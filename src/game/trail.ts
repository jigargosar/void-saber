import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { type Color3 } from '@babylonjs/core/Maths/math';
import { type BladeSegment, type TrailBuffers, type TrailBundle } from './types';

export const TRAIL_SAMPLE_COUNT       = 60;
export const TRAIL_FLOATS_PER_SAMPLE  = 6;
export const TRAIL_EMIT_THRESHOLD     = 0.01;
export const TRAIL_MAX_AGE            = 15;
export const TRAIL_SPAWN_ALPHA_TIP    = 0.4;
export const TRAIL_SPAWN_ALPHA_BASE   = 0.05;
export const TRAIL_ACCEL_SENSITIVITY  = 300;
export const TRAIL_FADE_RATE_MIN      = 0.5;
export const TRAIL_FADE_RATE_MAX      = 5.0;

export function buildTrail(name: string, color: Color3): TrailBundle {
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

export function startTrail(buffers: TrailBuffers, mesh: Mesh, blade: BladeSegment): void {
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
