import { Vec2 } from 'planck';
import { type System } from '../../ecs';
import { type DamageEvent } from './events';
import { activeBullets, livingEnemies } from './world';
import { BULLET_RADIUS } from './data';

export function createBulletCollisionSystem(
  onDamage: (event: DamageEvent) => void,
): System {
  return () => {
    for (const bullet of activeBullets) {
      for (const enemy of livingEnemies) {
        const dist = Vec2.distance(bullet.position, enemy.position);
        const hitRadius = BULLET_RADIUS + (enemy.sprite?.el.clientWidth ?? 20) / 2;

        if (dist < hitRadius) {
          onDamage({
            target: enemy,
            source: bullet,
            amount: bullet.damage ?? 1,
          });
          break;
        }
      }
    }
  };
}
