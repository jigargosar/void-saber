Phase 1: Project Scaffold

1. `pnpm create vite void-saber --template vanilla-ts`
2. `pnpm add three` and `pnpm add -D @types/three`
3. Set up `vite.config.ts` with HTTPS (required for WebXR):
   - Use `@vitejs/plugin-basic-ssl` or manual cert
4. Basic `index.html` — minimal, just a canvas and "Enter VR" button
5. `main.ts`:
   - Create `WebGLRenderer` with `antialias: true, alpha: false`
   - `renderer.xr.enabled = true`
   - Add `VRButton` from three/examples (or minimal custom version)
   - Create `Scene`, `PerspectiveCamera`
   - `renderer.setAnimationLoop(frame)` for the XR-compatible render loop
   - Handle both XR and flat-screen (no extra code — same loop, camera auto-switches)
