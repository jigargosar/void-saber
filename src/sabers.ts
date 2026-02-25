import { Scene } from '@babylonjs/core/scene';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math';
import { Theme, Hand, handColor } from './theme';
import { createTrail } from './trail';

const darkSteel  = new Color3(0.35, 0.35, 0.4);
const lightSteel = new Color3(0.4, 0.4, 0.4);

const BLADE_HEIGHT  = 1.0;
const BLADE_RADIUS  = 0.02;
const HANDLE_HEIGHT = 0.2;
const HANDLE_RADIUS = 0.03;

export interface Sabers {
  dispose(): void;
}

function createHandle(name: string, root: TransformNode, scene: Scene): void {
  const mat = new StandardMaterial(`${name}HandleMat`, scene);
  mat.diffuseColor = darkSteel;
  mat.specularColor = lightSteel;

  const mesh = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT, diameter: HANDLE_RADIUS * 2, tessellation: 12,
  }, scene);
  mesh.material = mat;
  mesh.position.y = HANDLE_HEIGHT / 2;
  mesh.parent = root;
}

function createBlade(name: string, color: Color3, root: TransformNode, scene: Scene): void {
  const mat = new StandardMaterial(`${name}BladeMat`, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;

  const mesh = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT, diameter: BLADE_RADIUS * 2, tessellation: 12,
  }, scene);
  mesh.material = mat;
  mesh.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  mesh.parent = root;
}

interface SaberParts {
  root: TransformNode;
  startTrail(): void;
}

function buildSaber(name: string, color: Color3, scene: Scene): SaberParts {
  const root = new TransformNode(name, scene);
  root.rotation.x = Math.PI / 2;
  createHandle(name, root, scene);
  createBlade(name, color, root, scene);

  const bladeBase = new TransformNode(`${name}BladeBase`, scene);
  bladeBase.position.y = HANDLE_HEIGHT;
  bladeBase.parent = root;

  const bladeTip = new TransformNode(`${name}BladeTip`, scene);
  bladeTip.position.y = HANDLE_HEIGHT + BLADE_HEIGHT;
  bladeTip.parent = root;

  const trail = createTrail(name, bladeBase, bladeTip, color, scene);

  function startTrail(): void {
    trail.start();
  }

  return { root, startTrail };
}

export function createSabers(scene: Scene, input: WebXRInput, theme: Theme): Sabers {
  const onAdded = input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (handedness === 'none') return;

    const hand  = handedness as Hand;
    const color = handColor(theme, hand);
    const name  = `saber_${hand}`;

    const { root, startTrail } = buildSaber(name, color, scene);

    source.onMotionControllerInitObservable.addOnce(() => {
      if (source.grip) {
        root.parent = source.grip;
        startTrail();
      }
    });
  });

  function dispose(): void {
    input.onControllerAddedObservable.remove(onAdded);
  }

  return { dispose };
}
