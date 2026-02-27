/**
 * External event bridge: timer → ECS.
 *
 * 9.3 — setInterval spawns enemies according to wave definitions.
 */

import { type Teardown } from '../../ecs';
import { world } from './world';
import { WAVES, ENEMY_TYPES, CANVAS_WIDTH } from './data';

export function createWaveSpawner(): Teardown {
  let waveIndex = 0;
  let spawnCount = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;

  function spawnEnemy(): void {
    if (waveIndex >= WAVES.length) {
      // Loop waves
      waveIndex = 0;
    }

    const wave = WAVES[waveIndex];
    const def = ENEMY_TYPES.get(wave.enemyType);
    if (!def) return;

    const padding = 40;
    const x = padding + Math.random() * (CANVAS_WIDTH - padding * 2);

    world.add({
      enemy: true,
      enemyType: wave.enemyType,
      position: { x, y: -def.size },
      velocity: { dx: 0, dy: def.speed },
      health: { current: def.health, max: def.health },
    });

    spawnCount++;
    if (spawnCount >= wave.count) {
      spawnCount = 0;
      waveIndex++;
      restartTimer();
    }
  }

  function restartTimer(): void {
    if (timerId !== null) clearInterval(timerId);
    if (waveIndex >= WAVES.length) waveIndex = 0;
    const wave = WAVES[waveIndex];
    timerId = setInterval(spawnEnemy, wave.delayMs);
  }

  restartTimer();

  return () => {
    if (timerId !== null) clearInterval(timerId);
  };
}
