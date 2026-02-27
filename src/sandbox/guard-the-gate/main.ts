/**
 * Guard the Gate — Bootstrap.
 *
 * Wires: turret entity, event queues + handlers, system pipeline,
 * external bridges, score state, and the game loop.
 */

import { type System, createEventQueue, createPipeline, state, reactTo } from '../../ecs';
import { type DamageEvent, type BreachEvent, type CollectEvent } from './events';
import { type Seconds } from './types';
import { world, livingEnemies, turrets, activeBullets } from './world';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TURRET_Y,
  POWER_UP_DROP_CHANCE, POWER_UP_TYPES,
} from './data';
import { createMovementSystem } from './movement-system';
import { createBulletCollisionSystem } from './bullet-collision-system';
import { createGateCollisionSystem } from './gate-collision-system';
import { createHoverSystem } from './hover-system';
import { createLifetimeSystem } from './lifetime-system';
import { createThawSystem } from './thaw-system';
import { createRenderPipeline } from './render-pipeline';
import { bridgeInput, getMousePos } from './input-bridge';
import { createWaveSpawner } from './wave-spawner';

// ── DOM ─────────────────────────────────────────────────────────────

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

const container = requireElement('game');
const scoreEl = requireElement('score');

// ── Score (reactive state — exercises MobX layer) ───────────────────

const score = state(0);
const teardownScore = reactTo(
  () => score.get(),
  (value) => { scoreEl.textContent = `Score: ${value}`; },
);

// ── Delta time ──────────────────────────────────────────────────────

let dt: Seconds = 0;
let lastTime = performance.now();
const getDt = (): Seconds => dt;

// ── Turret entity (singleton) ───────────────────────────────────────

function createTurretSprite(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;width:24px;height:24px;pointer-events:none;';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '12,0 24,24 0,24');
  polygon.setAttribute('fill', '#00e5ff');
  svg.appendChild(polygon);

  wrapper.appendChild(svg);
  return wrapper;
}

const turretEl = createTurretSprite();
container.appendChild(turretEl);

world.add({
  turret: true,
  position: { x: CANVAS_WIDTH / 2, y: TURRET_Y },
  aimAngle: -Math.PI / 2,
  health: { current: 3, max: 3 },
  sprite: { el: turretEl },
});

// ── Particle spawner (helper) ───────────────────────────────────────

function spawnParticles(x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    world.add({
      particle: true,
      position: { x, y },
      velocity: { dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed },
      lifetime: 0.3 + Math.random() * 0.4,
    });
  }
}

// ── Power-up drop (helper) ──────────────────────────────────────────

const POWER_UP_KEYS = [...POWER_UP_TYPES.keys()];

function maybeDropPowerUp(x: number, y: number): void {
  if (Math.random() > POWER_UP_DROP_CHANCE) return;
  const typeId = POWER_UP_KEYS[Math.floor(Math.random() * POWER_UP_KEYS.length)];
  world.add({
    powerUp: true,
    powerUpType: typeId,
    position: { x, y },
  });
}

// ── Event handlers (6.1, 6.2, 6.3) ─────────────────────────────────

function handleDamage(event: DamageEvent): void {
  const health = event.target.health;
  if (!health || health.current <= 0) return;

  health.current -= event.amount;
  if (health.current <= 0) {
    const pos = event.target.position;
    if (pos) {
      spawnParticles(pos.x, pos.y, 5);
      maybeDropPowerUp(pos.x, pos.y);
    }
    world.remove(event.target);
    score.set(score.get() + 10);
  }

  world.remove(event.source);
}

function handleBreach(event: BreachEvent): void {
  world.remove(event.enemy);
  score.set(score.get() - 20);
  container.style.transform = 'translateX(5px)';
  setTimeout(() => { container.style.transform = ''; }, 100);
}

function handleCollect(event: CollectEvent): void {
  const typeId = event.powerUp.powerUpType;
  const def = typeId ? POWER_UP_TYPES.get(typeId) : undefined;
  if (!def) return;

  switch (def.effect) {
    case 'freeze':
      for (const enemy of livingEnemies) {
        world.addComponent(enemy, 'frozen', def.duration);
      }
      break;
    case 'shield':
      for (const turret of turrets) {
        world.addComponent(turret, 'shielded', true);
      }
      break;
    case 'heal':
      for (const turret of turrets) {
        const h = turret.health;
        if (h) h.current = Math.min(h.current + 1, h.max);
      }
      break;
  }

  world.remove(event.powerUp);
}

// ── Event queues ────────────────────────────────────────────────────

const damageEvents  = createEventQueue<DamageEvent>(handleDamage);
const breachEvents  = createEventQueue<BreachEvent>(handleBreach);
const collectEvents = createEventQueue<CollectEvent>(handleCollect);

// ── Offscreen cleanup system ────────────────────────────────────────

function createOffscreenSystem(): System {
  return () => {
    for (const entity of activeBullets) {
      const p = entity.position;
      if (p.y < -20 || p.y > CANVAS_HEIGHT + 20 ||
          p.x < -20 || p.x > CANVAS_WIDTH + 20) {
        world.remove(entity);
      }
    }
  };
}

// ── Turret render system (handles rotation) ─────────────────────────

function createTurretRenderSystem(): System {
  return () => {
    for (const turret of turrets) {
      if (!turret.sprite) continue;
      const el = turret.sprite.el;
      const halfW = el.clientWidth / 2;
      const halfH = el.clientHeight / 2;
      const angle = turret.aimAngle + Math.PI / 2;
      el.style.transform =
        `translate(${turret.position.x - halfW}px, ${turret.position.y - halfH}px) rotate(${angle}rad)`;
    }
  };
}

// ── Render pipeline ─────────────────────────────────────────────────

const { teardown: teardownRender, sync: renderSync } = createRenderPipeline(container);

// ── System pipeline ─────────────────────────────────────────────────

const tick = createPipeline(
  [
    createMovementSystem(getDt),
    createBulletCollisionSystem((e) => damageEvents.push(e)),
    createGateCollisionSystem((e) => breachEvents.push(e)),
    createHoverSystem(getMousePos),
    createLifetimeSystem(getDt),
    createThawSystem(getDt),
    createOffscreenSystem(),
    renderSync,
    createTurretRenderSystem(),
  ],
  [damageEvents, breachEvents, collectEvents],
);

// ── External bridges ────────────────────────────────────────────────

const teardownInput = bridgeInput(container, (e) => collectEvents.push(e));
const teardownWaves = createWaveSpawner();

// Capture teardowns for future shutdown
void teardownRender;
void teardownInput;
void teardownWaves;
void teardownScore;

// ── Game loop ───────────────────────────────────────────────────────

function frame(now: number): void {
  dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  tick();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
