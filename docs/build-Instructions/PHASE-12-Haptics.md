Phase 12: Haptics

```typescript
// haptics.ts
function pulse(controller: THREE.XRTargetRaySpace, intensity: number, duration: number) {
  const session = renderer.xr.getSession();
  if (!session) return;
  const source = controller.userData.inputSource as XRInputSource;
  const gamepad = source?.gamepad;
  const haptic = gamepad?.hapticActuators?.[0];
  if (haptic) {
    haptic.pulse(intensity, duration);
  }
}

// Usage:
pulse(rightController, 0.6, 80);   // Cube hit: medium pulse, 80ms
pulse(leftController, 0.3, 40);    // Saber contact: light pulse, 40ms
```

- Cube hit: `intensity 0.6, duration 80ms`
- Saber-saber contact: `intensity 0.3, duration 40ms`
- Miss: no haptic (absence of feedback IS the feedback)
- Menu click: `intensity 0.15, duration 30ms` (subtle confirmation)
