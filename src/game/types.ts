import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { type TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { type Vector3 } from '@babylonjs/core/Maths/math';
import { type WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';
import { type Hand } from '../theme';

export interface BladeSegment {
  readonly base: TransformNode;
  readonly tip: TransformNode;
}

export interface SaberVisual {
  readonly root: TransformNode;
  readonly blade: BladeSegment;
}

export interface TrailBuffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly ages: Float32Array;
  prevSpeed: number;
  started: boolean;
}

export interface TrailBundle {
  readonly mesh: Mesh;
  readonly buffers: TrailBuffers;
}

export interface CollisionEvent {
  readonly point: Vector3;
}

export type Entity = {
  hand?: Hand;
  input?: WebXRInputSource;
  saber?: SaberVisual;
  trailMesh?: Mesh;
  trailBuffers?: TrailBuffers;
  gripBound?: true;
};
