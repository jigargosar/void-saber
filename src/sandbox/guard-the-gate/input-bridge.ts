/**
 * External event bridge: mouse events → ECS.
 *
 * 9.1 — mousemove → update turret aim angle
 * 9.2 — click → spawn bullet entity (or collect hovered power-up)
 */

import { type Teardown } from '../../ecs';
import { type Position } from './types';
import { type CollectEvent } from './events';
import { world, turrets, hoveredPowerUps } from './world';
import { CANVAS_WIDTH, BULLET_SPEED, BULLET_DAMAGE } from './data';

// ── Mouse state (module-level, read by hover system) ────────────────

const mousePos: Position = { x: CANVAS_WIDTH / 2, y: 0 };

export function getMousePos(): Position {
  return mousePos;
}

// ── Bridge ──────────────────────────────────────────────────────────

export function bridgeInput(
  container: HTMLElement,
  onCollect: (event: CollectEvent) => void,
): Teardown {
  function onMouseMove(e: MouseEvent): void {
    const r = container.getBoundingClientRect();
    mousePos.x = e.clientX - r.left;
    mousePos.y = e.clientY - r.top;

    // Update turret aim angle
    for (const turret of turrets) {
      const dx = mousePos.x - turret.position.x;
      const dy = mousePos.y - turret.position.y;
      turret.aimAngle = Math.atan2(dy, dx);
    }
  }

  function onClick(): void {
    // If hovering a power-up, collect it instead of shooting
    if (hoveredPowerUps.size > 0) {
      for (const powerUp of hoveredPowerUps) {
        onCollect({ powerUp });
        break;
      }
      return;
    }

    // Spawn bullet from turret toward mouse
    for (const turret of turrets) {
      const angle = turret.aimAngle ?? 0;
      world.add({
        bullet: true,
        damage: BULLET_DAMAGE,
        position: { x: turret.position.x, y: turret.position.y },
        velocity: {
          dx: Math.cos(angle) * BULLET_SPEED,
          dy: Math.sin(angle) * BULLET_SPEED,
        },
      });
    }
  }

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onClick);

  return () => {
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('click', onClick);
  };
}
