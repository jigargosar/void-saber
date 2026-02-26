import { type Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { type System } from '../ecs';
import { activeTrails } from './world';
import {
  TRAIL_SAMPLE_COUNT, TRAIL_FLOATS_PER_SAMPLE, TRAIL_EMIT_THRESHOLD,
  TRAIL_MAX_AGE, TRAIL_SPAWN_ALPHA_TIP, TRAIL_SPAWN_ALPHA_BASE,
  TRAIL_ACCEL_SENSITIVITY, TRAIL_FADE_RATE_MIN, TRAIL_FADE_RATE_MAX,
} from './trail';

export function createTrailUpdateSystem(scene: Scene): System {
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
