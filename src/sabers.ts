import { Scene } from '@babylonjs/core/scene';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math';
import { Theme, Hand, handColor } from './theme';

const HANDLE_COLOR    = new Color3(0.1, 0.1, 0.12);
const HANDLE_SPECULAR = new Color3(0.4, 0.4, 0.4);

const BLADE_HEIGHT  = 1.0;
const BLADE_RADIUS  = 0.02;
const HANDLE_HEIGHT = 0.2;
const HANDLE_RADIUS = 0.03;

export interface Sabers {
  dispose(): void;
}

function buildSaber(name: string, bladeColor: Color3, scene: Scene): TransformNode {
  const root = new TransformNode(name, scene);
  root.rotation.x = Math.PI / 2;

  const handleMat = new StandardMaterial(`${name}HandleMat`, scene);
  handleMat.diffuseColor = HANDLE_COLOR;
  handleMat.specularColor = HANDLE_SPECULAR;

  const handle = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT,
    diameter: HANDLE_RADIUS * 2,
    tessellation: 12,
  }, scene);
  handle.material = handleMat;
  handle.position.y = HANDLE_HEIGHT / 2;
  handle.parent = root;

  const bladeMat = new StandardMaterial(`${name}BladeMat`, scene);
  bladeMat.emissiveColor = bladeColor;
  bladeMat.disableLighting = true;

  const blade = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT,
    diameter: BLADE_RADIUS * 2,
    tessellation: 12,
  }, scene);
  blade.material = bladeMat;
  blade.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  blade.parent = root;

  return root;
}

export function createSabers(scene: Scene, input: WebXRInput, theme: Theme): Sabers {
  const onAdded = input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (handedness === 'none') return;

    const hand  = handedness as Hand;
    const color = handColor(theme, hand);
    const name  = `saber_${hand}`;

    const saber = buildSaber(name, color, scene);

    source.onMotionControllerInitObservable.addOnce(() => {
      if (source.grip) saber.parent = source.grip;
    });
  });

  function dispose(): void {
    input.onControllerAddedObservable.remove(onAdded);
  }

  return { dispose };
}
