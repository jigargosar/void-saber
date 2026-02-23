Phase 7: Beat-Reactive Environment

> On every beat, the world breathes.

One unified system, not per-song choreography:

```typescript
// environment.ts
// Reads beat clock → drives visual parameters

function updateEnvironment(beatFraction: number, energy: number) {
  // beatFraction: 0.0 to 1.0 within each beat (0 = on the beat)
  // energy: 0.0 to 1.0 from song section

  const pulse = Math.exp(-beatFraction * 6); // sharp attack, smooth decay

  // Pillar emission intensity: brighter on beat
  pillars.forEach(p => {
    p.material.emissiveIntensity = 0.3 + pulse * 0.7 * energy;
  });

  // Fog density shift: slightly thinner on beat
  scene.fog.density = baseDensity - pulse * 0.005;

  // Track edge glow: pulse brightness
  trackEdges.material.emissiveIntensity = 0.5 + pulse * 0.5;

  // Background ring rotation: continuous, speed varies with energy
  rings.forEach(r => r.rotation.z += 0.001 * energy);

  // Optional: subtle color temperature shift between left/right theme colors
}
```

- Same behavior every song — generic, driven by beat clock
- `energy` value can be constant for core (all songs energy=1.0), or per-section if songs define sections
- The `pulse = exp(-t * k)` pattern is the key — sharp on beat, smooth falloff, feels musical
- Very little code, massive visual impact
