import { Scene } from '@babylonjs/core/scene';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math';

const CYAN    = new Color3(0, 0.9, 0.95);
const MAGENTA = new Color3(0.95, 0, 0.7);

export interface Controllers {
  dispose(): void;
}

function makeControllerMesh(name: string, color: Color3, scene: Scene) {
  const mat = new StandardMaterial(`${name}Mat`, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;

  const mesh = MeshBuilder.CreateBox(name, { width: 0.05, height: 0.05, depth: 0.2 }, scene);
  mesh.material = mat;
  return mesh;
}

export function createControllers(scene: Scene, input: WebXRInput): Controllers {
  const onAdded = input.onControllerAddedObservable.add((source) => {
    const isLeft = source.inputSource.handedness === 'left';
    const color  = isLeft ? CYAN : MAGENTA;
    const name   = isLeft ? 'controllerL' : 'controllerR';

    const mesh = makeControllerMesh(name, color, scene);

    source.onMotionControllerInitObservable.addOnce(() => {
      if (source.grip) mesh.parent = source.grip;
    });
  });

  function dispose(): void {
    input.onControllerAddedObservable.remove(onAdded);
  }

  return { dispose };
}
