Phase 11: Particles

All particles use `RoundedBoxGeometry` (tiny, ~0.03 units) for visual consistency.

## Cube Cut Burst

On successful hit:
1. Deactivate the cube
2. Spawn 8-12 tiny rounded cubes at the cube's position
3. Each particle gets:
   - Random velocity: outward from cut center + slight randomization
   - Velocity component in saber swing direction (feels like the cut scattered them)
   - Gravity: subtract from Y velocity each frame (`vy -= 9.8 * dt`)
   - Color: same as the cube that was cut (cyan or magenta)
   - Opacity: fade from 1.0 to 0.0 over ~0.8 seconds
4. Deactivate particle when opacity reaches 0 or Y < -2 (fell out of view)

Pool: pre-allocate ~100 particle objects, reuse.

## Saber Spark

On saber-saber contact:
1. Spawn 5-8 tiny white/yellow particles at intersection point
2. Short lifespan (~0.3 seconds)
3. Fast outward velocity, gravity, rapid fade
4. `AdditiveBlending` material — looks like sparks
