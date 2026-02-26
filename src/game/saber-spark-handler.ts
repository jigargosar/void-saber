import { type Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Vector3, Color4 } from '@babylonjs/core/Maths/math';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { type SaberCollisionEvent } from './types';

const SPARK_COUNT = 500;
const SPARK_LIFETIME_MIN = 0.04;
const SPARK_LIFETIME_MAX = 0.15;
const SPARK_SPEED_MIN = 0.3;
const SPARK_SPEED_MAX = 1.2;
const SPARK_SIZE_MIN = 0.004;
const SPARK_SIZE_MAX = 0.01;

export function createSaberSparkHandler(scene: Scene): (event: SaberCollisionEvent) => void {
  let sparks: ParticleSystem | null = null;

  function ensureSystem(): ParticleSystem {
    if (sparks) return sparks;

    const ps = new ParticleSystem('saberSparks', SPARK_COUNT, scene);
    ps.particleTexture = new Texture('https://assets.babylonjs.com/textures/flare.png', scene);

    ps.minLifeTime = SPARK_LIFETIME_MIN;
    ps.maxLifeTime = SPARK_LIFETIME_MAX;
    ps.minEmitPower = SPARK_SPEED_MIN;
    ps.maxEmitPower = SPARK_SPEED_MAX;

    ps.minSize = SPARK_SIZE_MIN;
    ps.maxSize = SPARK_SIZE_MAX;
    ps.minScaleX = 0.6;
    ps.maxScaleX = 1.2;
    ps.minScaleY = 8;
    ps.maxScaleY = 15;

    ps.color1 = new Color4(1, 1, 1, 1);
    ps.color2 = new Color4(1, 1, 1, 1);
    ps.colorDead = new Color4(1, 1, 1, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;

    ps.direction1 = new Vector3(-1, -1, -1);
    ps.direction2 = new Vector3(1, 1, 1);
    ps.gravity = Vector3.Zero();

    ps.minEmitBox = Vector3.Zero();
    ps.maxEmitBox = Vector3.Zero();
    ps.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED_LOCAL;

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
