Phase 10: Collision Detection

## Saber ↔ Cube

- Each frame: test saber blade line segment against cube bounding box
- Blade is a line from handle end to tip in world space
- Use simple AABB or OBB intersection
- On hit:
  - Check direction: compare saber swing velocity direction to cube's required direction
  - Velocity = current tip position - previous frame tip position
  - Angle between velocity vector and required direction must be within ~60° tolerance
  - If direction correct → successful cut
  - If direction wrong → miss (cube passes through, maybe flash red briefly)

## Saber ↔ Saber

- Each frame: test if the two blade line segments are within proximity (~0.05 units)
- Use closest-point-between-two-line-segments algorithm
- If close enough:
  - Spawn spark particles at midpoint
  - Fire haptic pulse on both controllers
  - Brief white flash at intersection point
