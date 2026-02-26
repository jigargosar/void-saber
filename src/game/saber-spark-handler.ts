import { type Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Vector3, Color4 } from '@babylonjs/core/Maths/math';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { type SaberCollisionEvent } from './types';

const SPARK_COUNT = 30;
const SPARK_LIFETIME_MIN = 0.05;
const SPARK_LIFETIME_MAX = 0.15;
const SPARK_SPEED_MIN = 2;
const SPARK_SPEED_MAX = 6;
const SPARK_SIZE_MIN = 0.01;
const SPARK_SIZE_MAX = 0.04;
const SPARK_GRAVITY = -4;

export function createSaberSparkHandler(scene: Scene): (event: SaberCollisionEvent) => void {
  let sparks: ParticleSystem | null = null;

  function ensureSystem(): ParticleSystem {
    if (sparks) return sparks;

    const ps = new ParticleSystem('saberSparks', SPARK_COUNT, scene);
    ps.particleTexture = new Texture('https://assets.babylonjs.com/textures/flare.png', scene);

    ps.minLifeTime = SPARK_LIFETIME_MIN;
    ps.maxLifeTime = SPARK_LIFETIME_MAX;
    ps.minSize = SPARK_SIZE_MIN;
    ps.maxSize = SPARK_SIZE_MAX;
    ps.minEmitPower = SPARK_SPEED_MIN;
    ps.maxEmitPower = SPARK_SPEED_MAX;

    ps.color1 = new Color4(1, 1, 1, 1);
    ps.color2 = new Color4(0.8, 0.6, 1, 1);
    ps.colorDead = new Color4(0.3, 0.1, 0.5, 0);

    ps.direction1 = new Vector3(-1, -1, -1);
    ps.direction2 = new Vector3(1, 1, 1);
    ps.gravity = new Vector3(0, SPARK_GRAVITY, 0);

    ps.emitRate = 0;
    ps.manualEmitCount = 0;

    ps.start();
    sparks = ps;
    return ps;
  }

  return (event: SaberCollisionEvent) => {
    const ps = ensureSystem();
    ps.emitter = event.point;
    ps.manualEmitCount = SPARK_COUNT;
  };
}
