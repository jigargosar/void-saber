Phase 6: Corridor Environment

**The vibe:** Dark void with neon elements. Not a detailed room — a feeling of infinite space with structure.

## Track / Runway

- Long `PlaneGeometry` (or thin box) extending from player into the far distance
- Dark material with emissive neon edge lines (cyan/magenta or white)
- Subtle grid lines on the surface, scrolling toward the player (treadmill effect)
- Grid scroll speed synced to BPM

## Side Pillars

- Simple `BoxGeometry` or `CylinderGeometry` pillars flanking the track
- Emissive material matching theme colors
- Spaced evenly, receding into the distance (8-12 per side)
- Slight glow via emissive + nearby point lights

## Fog

- `scene.fog = new THREE.FogExp2(color, density)`
- Very dark base color with slight hue tint
- Makes distant pillars and track fade naturally
- Hides the "end of the world"

## Overhead

- Keep it simple — dark void is fine
- Optional: very distant, dim, large ring geometries for depth perception
