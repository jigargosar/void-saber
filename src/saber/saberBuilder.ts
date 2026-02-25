import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math';

const darkSteel  = new Color3(0.35, 0.35, 0.4);
const lightSteel = new Color3(0.4, 0.4, 0.4);

const BLADE_HEIGHT  = 1.0;
export const BLADE_RADIUS  = 0.02;
const HANDLE_HEIGHT = 0.2;
const HANDLE_RADIUS = 0.03;

export interface BladeSegment {
  base: TransformNode;
  tip: TransformNode;
}

export interface Saber {
  root: TransformNode;
  blade: BladeSegment;
}

export function buildSaber(name: string, color: Color3, scene: Scene): Saber {
  const root = new TransformNode(name, scene);
  root.rotation.x = Math.PI / 2;

  const handleMat = new StandardMaterial(`${name}HandleMat`, scene);
  handleMat.diffuseColor = darkSteel;
  handleMat.specularColor = lightSteel;
  const handle = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT, diameter: HANDLE_RADIUS * 2, tessellation: 12,
  }, scene);
  handle.material = handleMat;
  handle.position.y = HANDLE_HEIGHT / 2;
  handle.parent = root;

  const bladeMat = new StandardMaterial(`${name}BladeMat`, scene);
  bladeMat.emissiveColor = color;
  bladeMat.disableLighting = true;
  const bladeMesh = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT, diameter: BLADE_RADIUS * 2, tessellation: 12,
  }, scene);
  bladeMesh.material = bladeMat;
  bladeMesh.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  bladeMesh.parent = root;

  const base = new TransformNode(`${name}BladeBase`, scene);
  base.position.y = HANDLE_HEIGHT;
  base.parent = root;

  const tip = new TransformNode(`${name}BladeTip`, scene);
  tip.position.y = HANDLE_HEIGHT + BLADE_HEIGHT;
  tip.parent = root;

  return { root, blade: { base, tip } };
}
