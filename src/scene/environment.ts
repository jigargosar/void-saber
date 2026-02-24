import * as THREE from 'three';
import FakeGlowMaterial from '../shaders/FakeGlowMaterial';

// --- HSL helper ---
function hsl(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(h / 360, s, l);
}

// --- Colors ---
const BG_COLOR = hsl(240, 0.08, 0.015);
const CYAN = hsl(185, 1.0, 0.55);
const MAGENTA = hsl(310, 1.0, 0.6);
const TRACK_SURFACE = hsl(220, 0.2, 0.045);
const GRID_LINE_CYAN = hsl(185, 0.9, 0.45);

// --- Dimensions ---
const TRACK_WIDTH = 4;
const TRACK_LENGTH = 200;
const EDGE_X = TRACK_WIDTH / 2;
const PILLAR_X = 3.8;

// Shared glow sphere geometry (smooth for proper normals)
const GLOW_SPHERE_GEO = new THREE.IcosahedronGeometry(1, 4);

export function createEnvironment(scene: THREE.Scene) {
  const group = new THREE.Group();

  // ── Background & Fog ──
  scene.background = BG_COLOR;
  scene.fog = new THREE.FogExp2(BG_COLOR, 0.035);

  // ── Lighting ──
  const hemi = new THREE.HemisphereLight(
    hsl(220, 0.15, 0.06),
    hsl(240, 0.05, 0.01),
    0.06
  );
  group.add(hemi);

  // ── Track Surface (reflective) ──
  const trackGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH);
  const trackMat = new THREE.MeshStandardMaterial({
    color: TRACK_SURFACE,
    roughness: 0.15,
    metalness: 0.7,
  });
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.rotation.x = -Math.PI / 2;
  track.position.set(0, 0, -TRACK_LENGTH / 2);
  group.add(track);

  // ── Floor outside track ──
  const floorGeo = new THREE.PlaneGeometry(20, TRACK_LENGTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: hsl(240, 0.1, 0.02),
    roughness: 0.2,
    metalness: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.005, -TRACK_LENGTH / 2);
  group.add(floor);

  // ── Track Edge Lines ──
  const edgeGeo = new THREE.BoxGeometry(0.05, 0.03, TRACK_LENGTH);
  const edgeLeft = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: CYAN }));
  edgeLeft.position.set(-EDGE_X, 0.015, -TRACK_LENGTH / 2);
  group.add(edgeLeft);

  const edgeRight = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: MAGENTA }));
  edgeRight.position.set(EDGE_X, 0.015, -TRACK_LENGTH / 2);
  group.add(edgeRight);

  // ── Grid Lines ──
  const gridGeo = new THREE.BoxGeometry(TRACK_WIDTH - 0.1, 0.015, 0.05);
  const gridMat = new THREE.MeshBasicMaterial({ color: GRID_LINE_CYAN });
  const gridSpacing = 2;
  const gridCount = Math.floor(TRACK_LENGTH / gridSpacing);
  for (let i = 0; i < gridCount; i++) {
    const line = new THREE.Mesh(gridGeo, gridMat);
    line.position.set(0, 0.008, -i * gridSpacing - gridSpacing);
    group.add(line);
  }

  // ── Center line ──
  const centerLineGeo = new THREE.BoxGeometry(0.02, 0.01, TRACK_LENGTH);
  const centerLineMat = new THREE.MeshBasicMaterial({
    color: hsl(200, 0.5, 0.25), transparent: true, opacity: 0.4,
  });
  const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
  centerLine.position.set(0, 0.006, -TRACK_LENGTH / 2);
  group.add(centerLine);

  // ── Glow materials (shared, one per color) ──
  const cyanGlow = new FakeGlowMaterial({
    glowColor: CYAN,
    falloff: 0.15,
    glowInternalRadius: 4.0,
    glowSharpness: 0.6,
    opacity: 1.2,
  });

  const magentaGlow = new FakeGlowMaterial({
    glowColor: MAGENTA,
    falloff: 0.15,
    glowInternalRadius: 4.0,
    glowSharpness: 0.6,
    opacity: 1.2,
  });

  // ── Pillars with shader-based glow ──
  const pillarConfigs = [
    { z: -4, h: 10, side: 'both' as const, r: 0.08 },
    { z: -12, h: 7, side: 'both' as const, r: 0.06 },
    { z: -18, h: 12, side: 'both' as const, r: 0.09 },
    { z: -25, h: 6, side: 'both' as const, r: 0.05 },
    { z: -32, h: 14, side: 'both' as const, r: 0.1 },
    { z: -38, h: 8, side: 'both' as const, r: 0.07 },
    { z: -45, h: 11, side: 'both' as const, r: 0.08 },
    { z: -52, h: 5, side: 'left' as const, r: 0.05 },
    { z: -52, h: 9, side: 'right' as const, r: 0.07 },
    { z: -60, h: 13, side: 'both' as const, r: 0.09 },
    { z: -68, h: 7, side: 'both' as const, r: 0.06 },
    { z: -76, h: 10, side: 'both' as const, r: 0.08 },
    { z: -85, h: 15, side: 'both' as const, r: 0.1 },
    { z: -95, h: 8, side: 'both' as const, r: 0.07 },
  ];

  for (const cfg of pillarConfigs) {
    const geo = new THREE.CylinderGeometry(cfg.r, cfg.r, cfg.h, 8);
    // Glow sphere scale: wider than pillar, stretched to pillar height
    const glowScaleX = 0.8;
    const glowScaleY = cfg.h / 2;
    const glowScaleZ = 0.8;

    if (cfg.side === 'left' || cfg.side === 'both') {
      // Solid pillar core
      const pillar = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: CYAN }));
      pillar.position.set(-PILLAR_X, cfg.h / 2, cfg.z);
      group.add(pillar);

      // Glow halo (icosphere with FakeGlowMaterial)
      const glow = new THREE.Mesh(GLOW_SPHERE_GEO, cyanGlow);
      glow.position.set(-PILLAR_X, cfg.h / 2, cfg.z);
      glow.scale.set(glowScaleX, glowScaleY, glowScaleZ);
      group.add(glow);

      // Point light at base
      const light = new THREE.PointLight(CYAN, 6, 10, 2);
      light.position.set(-PILLAR_X, 0.3, cfg.z);
      group.add(light);
    }

    if (cfg.side === 'right' || cfg.side === 'both') {
      const pillar = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: MAGENTA }));
      pillar.position.set(PILLAR_X, cfg.h / 2, cfg.z);
      group.add(pillar);

      const glow = new THREE.Mesh(GLOW_SPHERE_GEO, magentaGlow);
      glow.position.set(PILLAR_X, cfg.h / 2, cfg.z);
      glow.scale.set(glowScaleX, glowScaleY, glowScaleZ);
      group.add(glow);

      const light = new THREE.PointLight(MAGENTA, 6, 10, 2);
      light.position.set(PILLAR_X, 0.3, cfg.z);
      group.add(light);
    }
  }

  // ── Horizontal Connector Beams ──
  const connectorPositions = [
    { z: -18, y: 10, w: PILLAR_X * 2 },
    { z: -32, y: 12, w: PILLAR_X * 2 },
    { z: -60, y: 11, w: PILLAR_X * 2 },
    { z: -85, y: 13, w: PILLAR_X * 2 },
  ];
  for (const cp of connectorPositions) {
    const connGeo = new THREE.CylinderGeometry(0.04, 0.04, cp.w, 6);
    const connMat = new THREE.MeshBasicMaterial({ color: hsl(200, 0.6, 0.6) });
    const conn = new THREE.Mesh(connGeo, connMat);
    conn.rotation.z = Math.PI / 2;
    conn.position.set(0, cp.y, cp.z);
    group.add(conn);

    // Glow on connectors too
    const connGlow = new THREE.Mesh(GLOW_SPHERE_GEO, new FakeGlowMaterial({
      glowColor: hsl(200, 0.5, 0.5),
      falloff: 0.2,
      glowInternalRadius: 5.0,
      glowSharpness: 0.4,
      opacity: 0.6,
    }));
    connGlow.position.set(0, cp.y, cp.z);
    connGlow.scale.set(cp.w / 2, 0.3, 0.3);
    connGlow.rotation.z = Math.PI / 2;
    group.add(connGlow);
  }

  // ── Deep Background Rings ──
  const ringMat = new THREE.MeshBasicMaterial({
    color: hsl(240, 0.15, 0.08), transparent: true, opacity: 0.12,
  });
  const farRings = [
    { z: -40, y: 20, radius: 18 },
    { z: -70, y: 25, radius: 25 },
    { z: -100, y: 18, radius: 22 },
  ];
  for (const rp of farRings) {
    const ringGeo = new THREE.TorusGeometry(rp.radius, 0.1, 8, 48);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, rp.y, rp.z);
    ring.rotation.x = Math.PI / 2 + 0.1;
    group.add(ring);
  }

  scene.add(group);

  // ── Cleanup ──
  function dispose() {
    scene.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  return { group, dispose };
}
