Phase 9: Cubes

## Geometry

- `RoundedBoxGeometry` — rounded cube, softer look, not sharp
- Source: Three.js addons (`three/examples/jsm/geometries/RoundedBoxGeometry`)
- Or generate manually: `BoxGeometry` + bevel via custom BufferGeometry
- Same geometry reused for all cubes (instanced or pooled)
- Size: ~0.4 × 0.4 × 0.4 units

## Arrow Indicator

- Direction arrow on the cube face
- Options:
  a. Canvas texture with arrow drawn per direction (8 textures, swap UV)
  b. Small arrow mesh (triangle + line) attached to cube face
  c. Single arrow texture, rotate the cube or UV to match direction
- Option (a) is simplest — pre-render 8 arrow canvases at startup

## Visual

- `MeshStandardMaterial` with emissive set to theme color
- Slight emissive intensity so they glow in the dark
- Different color for left vs right (cyan vs magenta)
- Can add a small `PointLight` per cube for local glow (watch performance — maybe just nearest 4-6)

## Movement

- Pool of cube objects (pre-allocate ~30)
- On spawn: activate from pool, set position to far Z, set lane/row, set arrival time
- Each frame: `cube.position.z = spawnZ + (cubeSpeed * elapsed)`
- When cube reaches player Z position (at `note.time`): it's hittable
- Small time window (~200ms) for successful hit
- If missed (passes player without hit): deactivate, miss event, pool return

## Lane/Row Positions

```
Rows (Y):    top=1.6   mid=1.2   bottom=0.8   (adjust for VR standing height)
Lanes (X):   -0.6  -0.2  0.2  0.6             (4 columns, ~0.4 apart)
```
