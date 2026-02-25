/**
 * Void Saber — main entry point
 * Babylon.js + WebXR
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { WebXRExperienceHelper } from '@babylonjs/core/XR/webXRExperienceHelper';
import { WebXREnterExitUI } from '@babylonjs/core/XR/webXREnterExitUI';

import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/loaders/glTF';

const CYAN    = new Color3(0, 0.9, 0.95);
const MAGENTA = new Color3(0.95, 0, 0.7);
const BG      = new Color3(0.01, 0.01, 0.03);

function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(BG.r, BG.g, BG.b, 1);
  scene.fogMode    = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.04;
  scene.fogColor   = BG;

  const camera = new FreeCamera('cam', new Vector3(0, 1.6, 0), scene);
  camera.setTarget(new Vector3(0, 1.6, -100));
  camera.attachControl(canvas, true);

  return scene;
}

function createEnvironment(scene: Scene): void {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.08;

  const glow = new GlowLayer('glow', scene, { mainTextureSamples: 4, blurKernelSize: 64 });
  glow.intensity = 1.2;

  const track = MeshBuilder.CreateGround('track', { width: 4, height: 200 }, scene);
  track.position.z = -100;
  const trackMat = new StandardMaterial('trackMat', scene);
  trackMat.diffuseColor = new Color3(0.02, 0.02, 0.03);
  trackMat.specularColor = Color3.Black();
  track.material = trackMat;

  const cyanMat = new StandardMaterial('cyan', scene);
  cyanMat.emissiveColor = CYAN;
  cyanMat.disableLighting = true;

  const magMat = new StandardMaterial('mag', scene);
  magMat.emissiveColor = MAGENTA;
  magMat.disableLighting = true;

  const edgeL = MeshBuilder.CreateBox('edgeL', { width: 0.03, height: 0.02, depth: 200 }, scene);
  edgeL.position.set(-2, 0.01, -100);
  edgeL.material = cyanMat;

  const edgeR = MeshBuilder.CreateBox('edgeR', { width: 0.03, height: 0.02, depth: 200 }, scene);
  edgeR.position.set(2, 0.01, -100);
  edgeR.material = magMat;

  for (let i = 0; i < 14; i++) {
    const z = -i * 6;

    const pL = MeshBuilder.CreateBox(`pL${i}`, { width: 0.12, height: 8, depth: 0.12 }, scene);
    pL.position.set(-3.5, 4, z);
    const mL = new StandardMaterial(`mL${i}`, scene);
    mL.emissiveColor = CYAN;
    mL.disableLighting = true;
    pL.material = mL;

    const pR = MeshBuilder.CreateBox(`pR${i}`, { width: 0.12, height: 8, depth: 0.12 }, scene);
    pR.position.set(3.5, 4, z);
    const mR = new StandardMaterial(`mR${i}`, scene);
    mR.emissiveColor = MAGENTA;
    mR.disableLighting = true;
    pR.material = mR;

    if (i < 2) {
      const lL = new PointLight(`lL${i}`, new Vector3(-3.5, 0.5, z), scene);
      lL.diffuse = CYAN;
      lL.intensity = 0.5;
      lL.range = 4;

      const lR = new PointLight(`lR${i}`, new Vector3(3.5, 0.5, z), scene);
      lR.diffuse = MAGENTA;
      lR.intensity = 0.5;
      lR.range = 4;
    }
  }
}

async function setupWebXR(scene: Scene): Promise<void> {
  const xrHelper = await WebXRExperienceHelper.CreateAsync(scene);
  await WebXREnterExitUI.CreateAsync(scene, xrHelper, { sessionMode: 'immersive-vr' });
  console.log('WebXR ready');
}

async function main(): Promise<void> {
  const canvas = document.getElementById('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas element not found');
  const engine = new Engine(canvas, true);
  const scene  = createScene(engine, canvas);

  createEnvironment(scene);
  setupWebXR(scene).catch(console.error);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
