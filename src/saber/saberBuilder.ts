import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math';
import {IDisposable} from "@babylonjs/core";

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

export interface Saber extends IDisposable {
  root: TransformNode;
  blade: BladeSegment;
}

function createHandle(name: string, parent: TransformNode): Mesh {
  const mat = new StandardMaterial(`${name}HandleMat`);
  mat.diffuseColor = darkSteel;
  mat.specularColor = lightSteel;

  const mesh = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT, diameter: HANDLE_RADIUS * 2, tessellation: 12,
  });
  mesh.material = mat;
  mesh.position.y = HANDLE_HEIGHT / 2;
  mesh.parent = parent;

  return mesh;
}

function createBlade(name: string, color: Color3, parent: TransformNode): Mesh {
  const mat = new StandardMaterial(`${name}BladeMat`);
  mat.emissiveColor = color;
  mat.disableLighting = true;

  const mesh = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT, diameter: BLADE_RADIUS * 2, tessellation: 12,
  });
  mesh.material = mat;
  mesh.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  mesh.parent = parent;

  return mesh;
}

function createBladeSegment(name: string, parent: TransformNode): BladeSegment {
  const base = new TransformNode(`${name}BladeBase`);
  base.position.y = HANDLE_HEIGHT;
  base.parent = parent;

  const tip = new TransformNode(`${name}BladeTip`);
  tip.position.y = HANDLE_HEIGHT + BLADE_HEIGHT;
  tip.parent = parent;

  return { base, tip };
}

export function buildSaber(name: string, color: Color3): Saber {
  const root = new TransformNode(name);
  root.rotation.x = Math.PI / 2;

  createHandle(name, root);
  createBlade(name, color, root);
  const segment = createBladeSegment(name, root);

  return { root, blade: segment, dispose: () => root.dispose(false, true) };
}
