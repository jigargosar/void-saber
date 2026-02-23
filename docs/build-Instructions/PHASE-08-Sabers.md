Phase 8: Sabers

## Mesh Structure (per saber)

```
Group
├── Handle: CylinderGeometry (dark material, MeshLambertMaterial)
├── Blade: CylinderGeometry (thin, MeshBasicMaterial with theme color)
├── Glow: CylinderGeometry (wider, transparent, MeshBasicMaterial, opacity ~0.15)
├── TipGlow: Small SphereGeometry at blade tip (emissive)
└── PointLight (theme color, low intensity, short range — casts on nearby surfaces)
```

- `MeshBasicMaterial` for blade/glow — unaffected by scene lighting, always bright
- Handle uses `MeshLambertMaterial` — responds to light, looks solid

## Swing Trail (CRITICAL for feel)

Ribbon mesh that records blade tip position each frame:

```typescript
// trails.ts

// Ring buffer of tip positions (last ~15 frames)
const TRAIL_LENGTH = 15;
const positions: THREE.Vector3[] = [];

function updateTrail(bladeTipWorld: THREE.Vector3) {
  positions.unshift(bladeTipWorld.clone());
  if (positions.length > TRAIL_LENGTH) positions.pop();

  // Build ribbon geometry from consecutive positions
  // Two vertices per sample: blade tip + offset along blade direction
  // UV.x = position along trail (for alpha fade)
  // Material: transparent, additive blending, theme color, fades to 0 at tail
}
```

- Use `BufferGeometry` with dynamically updated position attribute
- Material: `MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })`
- Alpha fades from ~0.6 at head to 0.0 at tail
- Fast swings = wide ribbon = looks powerful
- Slow/still = very short trail = clean

## XR Controller Binding

```typescript
// In XR frame loop:
const session = renderer.xr.getSession();
// controller0 and controller1 from renderer.xr.getController(0/1)
// Read grip space for saber position/rotation
// Saber group.position and .quaternion set from controller grip pose each frame
```

- In menu state: attach pointer mesh to controllers
- In playing state: swap to saber mesh
- Controller index to left/right hand mapping via XRInputSource.handedness
