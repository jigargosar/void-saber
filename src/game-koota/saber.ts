import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { type Color3 } from '@babylonjs/core/Maths/math';
import { type SaberVisual } from './types';

const BLADE_HEIGHT  = 1.0;
const BLADE_RADIUS  = 0.02;
const HANDLE_HEIGHT = 0.2;
const HANDLE_RADIUS = 0.03;

const DARK_STEEL_R = 0.35, DARK_STEEL_G = 0.35, DARK_STEEL_B = 0.4;
const LIGHT_STEEL_R = 0.4, LIGHT_STEEL_G = 0.4, LIGHT_STEEL_B = 0.4;

export const INTERSECT_DIST = BLADE_RADIUS * 2;

export function buildSaber(name: string, color: Color3): SaberVisual {
  const root = new TransformNode(name);
  root.rotation.x = Math.PI / 2;

  // Handle
  const handleMat = new StandardMaterial(`${name}HandleMat`);
  handleMat.diffuseColor.set(DARK_STEEL_R, DARK_STEEL_G, DARK_STEEL_B);
  handleMat.specularColor.set(LIGHT_STEEL_R, LIGHT_STEEL_G, LIGHT_STEEL_B);
  const handle = MeshBuilder.CreateCylinder(`${name}Handle`, {
    height: HANDLE_HEIGHT, diameter: HANDLE_RADIUS * 2, tessellation: 12,
  });
  handle.material = handleMat;
  handle.position.y = HANDLE_HEIGHT / 2;
  handle.parent = root;

  // Blade
  const bladeMat = new StandardMaterial(`${name}BladeMat`);
  bladeMat.emissiveColor = color;
  bladeMat.disableLighting = true;
  const bladeMesh = MeshBuilder.CreateCylinder(`${name}Blade`, {
    height: BLADE_HEIGHT, diameter: BLADE_RADIUS * 2, tessellation: 12,
  });
  bladeMesh.material = bladeMat;
  bladeMesh.position.y = HANDLE_HEIGHT + BLADE_HEIGHT / 2;
  bladeMesh.parent = root;

  // Blade segment (collision endpoints)
  const base = new TransformNode(`${name}BladeBase`);
  base.position.y = HANDLE_HEIGHT;
  base.parent = root;

  const tip = new TransformNode(`${name}BladeTip`);
  tip.position.y = HANDLE_HEIGHT + BLADE_HEIGHT;
  tip.parent = root;

  return { root, blade: { base, tip } };
}
