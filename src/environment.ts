import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';

const CYAN    = new Color3(0, 0.9, 0.95);
const MAGENTA = new Color3(0.95, 0, 0.7);
const BG      = new Color3(0.01, 0.01, 0.03);

const FOG_BASE     = 0.04;
const PILLAR_COUNT = 14;
const PILLAR_GAP   = 6;

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
  glow.intensity = 1.2;

  return glow;
}

function setupTrack(scene: Scene): void {
  const track = MeshBuilder.CreateGround('track', { width: 4, height: 200 }, scene);
  track.position.z = -100;
  const trackMat = new StandardMaterial('trackMat', scene);
  trackMat.diffuseColor = new Color3(0.02, 0.02, 0.03);
  trackMat.specularColor = Color3.Black();
  track.material = trackMat;

  const cyanMat = new StandardMaterial('edgeCyan', scene);
  cyanMat.emissiveColor = CYAN;
  cyanMat.disableLighting = true;

  const magMat = new StandardMaterial('edgeMag', scene);
  magMat.emissiveColor = MAGENTA;
  magMat.disableLighting = true;

  const edgeL = MeshBuilder.CreateBox('edgeL', { width: 0.03, height: 0.02, depth: 200 }, scene);
  edgeL.position.set(-2, 0.01, -100);
  edgeL.material = cyanMat;

  const edgeR = MeshBuilder.CreateBox('edgeR', { width: 0.03, height: 0.02, depth: 200 }, scene);
  edgeR.position.set(2, 0.01, -100);
  edgeR.material = magMat;
}

function setupPillars(scene: Scene): StandardMaterial[] {
  const mats: StandardMaterial[] = [];

  for (let i = 0; i < PILLAR_COUNT; i++) {
    const z = -i * PILLAR_GAP;

    const mL = new StandardMaterial(`pillarMatL${i}`, scene);
    mL.emissiveColor = CYAN;
    mL.disableLighting = true;
    const pL = MeshBuilder.CreateBox(`pillarL${i}`, { width: 0.12, height: 8, depth: 0.12 }, scene);
    pL.position.set(-3.5, 4, z);
    pL.material = mL;
    mats.push(mL);

    const mR = new StandardMaterial(`pillarMatR${i}`, scene);
    mR.emissiveColor = MAGENTA;
    mR.disableLighting = true;
    const pR = MeshBuilder.CreateBox(`pillarR${i}`, { width: 0.12, height: 8, depth: 0.12 }, scene);
    pR.position.set(3.5, 4, z);
    pR.material = mR;
    mats.push(mR);

    if (i < 2) {
      const lL = new PointLight(`pointL${i}`, new Vector3(-3.5, 0.5, z), scene);
      lL.diffuse = CYAN;
      lL.intensity = 0.5;
      lL.range = 4;

      const lR = new PointLight(`pointR${i}`, new Vector3(3.5, 0.5, z), scene);
      lR.diffuse = MAGENTA;
      lR.intensity = 0.5;
      lR.range = 4;
    }
  }

  return mats;
}

export function createEnvironment(scene: Scene): Environment {
  setupAtmosphere(scene);
  const glow = setupLighting(scene);
  setupTrack(scene);
  const pillarMats = setupPillars(scene);

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
