import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { Theme } from './theme';

const BG = new Color3(0.01, 0.01, 0.03);

const FOG_BASE     = 0.04;
const PILLAR_COUNT = 14;
const PILLAR_GAP   = 6;
const PILLAR_X     = 6;
const TRACK_HALF   = 100;  // track/edges span ±100 on Z
const RIB_COUNT    = 20;
const RIB_GAP      = 10;

export interface Environment {
  onBeat(): void;
  dispose(): void;
}

function setupAtmosphere(scene: Scene): void {
  scene.clearColor = new Color4(BG.r, BG.g, BG.b, 1);
  scene.fogMode    = Scene.FOGMODE_EXP2;
  scene.fogDensity = FOG_BASE;
  scene.fogColor   = BG;
}

function setupLighting(scene: Scene): GlowLayer {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.08;

  const glow = new GlowLayer('glow', scene, { mainTextureSamples: 4, blurKernelSize: 64 });
  glow.intensity = 1.08;
  glow.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
    if (mesh.name.endsWith('Trail')) {
      result.set(0, 0, 0, 0);
    } else {
      const mat = mesh.material as { emissiveColor?: { r: number; g: number; b: number } } | null;
      if (mat?.emissiveColor) {
        result.set(mat.emissiveColor.r, mat.emissiveColor.g, mat.emissiveColor.b, 1);
      } else {
        result.set(0, 0, 0, 0);
      }
    }
  };

  return glow;
}

function setupTrack(scene: Scene, _theme: Theme): void {
  const track = MeshBuilder.CreateGround('track', { width: 4, height: TRACK_HALF * 2 }, scene);
  track.position.z = 0;
  const trackMat = new StandardMaterial('trackMat', scene);
  trackMat.diffuseColor = new Color3(0.02, 0.02, 0.03);
  trackMat.specularColor = Color3.Black();
  track.material = trackMat;

  const leftMat = new StandardMaterial('edgeLeft', scene);
  leftMat.emissiveColor = Color3.White();
  leftMat.disableLighting = true;

  const rightMat = new StandardMaterial('edgeRight', scene);
  rightMat.emissiveColor = Color3.White();
  rightMat.disableLighting = true;

  const edgeL = MeshBuilder.CreateBox('edgeL', { width: 0.03, height: 0.02, depth: TRACK_HALF * 2 }, scene);
  edgeL.position.set(-2, 0.01, 0);
  edgeL.material = leftMat;

  const edgeR = MeshBuilder.CreateBox('edgeR', { width: 0.03, height: 0.02, depth: TRACK_HALF * 2 }, scene);
  edgeR.position.set(2, 0.01, 0);
  edgeR.material = rightMat;
}

function setupFloorRibs(scene: Scene, theme: Theme): void {
  const ribStart = Math.floor(RIB_COUNT / 2) * RIB_GAP;

  const leftMat = new StandardMaterial('ribLeft', scene);
  leftMat.emissiveColor = theme.leftHand.scale(0.4);
  leftMat.disableLighting = true;

  const rightMat = new StandardMaterial('ribRight', scene);
  rightMat.emissiveColor = theme.rightHand.scale(0.4);
  rightMat.disableLighting = true;

  for (let i = 0; i < RIB_COUNT; i++) {
    const z   = ribStart - i * RIB_GAP;
    const mat = i % 2 === 0 ? leftMat : rightMat;

    const rib = MeshBuilder.CreateCylinder(`rib${i}`, {
      height: 4, diameter: 0.03, tessellation: 8,
    }, scene);
    rib.rotation.z = Math.PI / 2;
    rib.position.set(0, -0.04, z);
    rib.material = mat;
  }
}

function setupPillars(scene: Scene, theme: Theme): StandardMaterial[] {
  const mats: StandardMaterial[] = [];
  const pillarStart = Math.floor(PILLAR_COUNT / 2) * PILLAR_GAP;

  for (let i = 0; i < PILLAR_COUNT; i++) {
    const z = pillarStart - i * PILLAR_GAP;

    const mL = new StandardMaterial(`pillarMatL${i}`, scene);
    mL.emissiveColor = new Color3(0.4, 0, 0.6);
    mL.disableLighting = true;
    const pL = MeshBuilder.CreateCylinder(`pillarL${i}`, { height: 8, diameter: 0.12, tessellation: 12 }, scene);
    pL.position.set(PILLAR_X, 2, z);
    pL.material = mL;
    mats.push(mL);

    const mR = new StandardMaterial(`pillarMatR${i}`, scene);
    mR.emissiveColor = new Color3(0.4, 0, 0.6);
    mR.disableLighting = true;
    const pR = MeshBuilder.CreateCylinder(`pillarR${i}`, { height: 8, diameter: 0.12, tessellation: 12 }, scene);
    pR.position.set(-PILLAR_X, 2, z);
    pR.material = mR;
    mats.push(mR);

    if (i < 2) {
      const lL = new PointLight(`pointL${i}`, new Vector3(-PILLAR_X, 0.5, z), scene);
      lL.diffuse = theme.leftHand;
      lL.intensity = 0.5;
      lL.range = 4;

      const lR = new PointLight(`pointR${i}`, new Vector3(PILLAR_X, 0.5, z), scene);
      lR.diffuse = theme.rightHand;
      lR.intensity = 0.5;
      lR.range = 4;
    }
  }

  return mats;
}

export function createEnvironment(scene: Scene, theme: Theme): Environment {
  setupAtmosphere(scene);
  const glow = setupLighting(scene);
  setupTrack(scene, theme);
  setupFloorRibs(scene, theme);
  const pillarMats = setupPillars(scene, theme);

  function onBeat(): void {
    scene.fogDensity = FOG_BASE * 1.8;
    setTimeout(() => { scene.fogDensity = FOG_BASE; }, 120);

    for (const mat of pillarMats) {
      const base = mat.emissiveColor.clone();
      mat.emissiveColor = base.scale(2.5);
      setTimeout(() => { mat.emissiveColor = base; }, 120);
    }
  }

  function dispose(): void {
    glow.dispose();
  }

  return { onBeat, dispose };
}
