import { Vector3 } from '@babylonjs/core/Maths/math';

export interface SegmentHit {
  dist: number;
  point: Vector3;
}

/** Closest distance between two line segments and their midpoint. */
export function segmentDistance(
  a0: Vector3, a1: Vector3, b0: Vector3, b1: Vector3,
): SegmentHit {
  const d1 = a1.subtract(a0);
  const d2 = b1.subtract(b0);
  const r = a0.subtract(b0);

  const a = Vector3.Dot(d1, d1);
  const e = Vector3.Dot(d2, d2);
  const f = Vector3.Dot(d2, r);

  let s = 0;
  let t = 0;

  if (a <= 1e-8 && e <= 1e-8) {
    s = 0; t = 0;
  } else if (a <= 1e-8) {
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = Vector3.Dot(d1, r);
    if (e <= 1e-8) {
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = Vector3.Dot(d1, d2);
      const denom = a * e - b * b;

      if (denom !== 0) {
        s = Math.max(0, Math.min(1, (b * f - c * e) / denom));
      } else {
        s = 0;
      }

      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }

  const closestA = a0.add(d1.scale(s));
  const closestB = b0.add(d2.scale(t));

  return {
    dist: Vector3.Distance(closestA, closestB),
    point: closestA.add(closestB).scale(0.5),
  };
}
