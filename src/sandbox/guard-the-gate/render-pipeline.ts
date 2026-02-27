/**
 * Event-driven visual systems (onEnter/onExit) + polling render sync.
 *
 * onEnter: create SVG sprite, attach to game container.
 * onExit: remove sprite from DOM.
 * Polling: sync entity position → sprite CSS transform.
 */

import { type Teardown, type System, onEnter, onExit } from '../../ecs';
import { type Entity } from './types';
import {
  enemies, bullets, powerUps, particles,
  hoveredPowerUps, frozenEnemies, renderables,
} from './world';
import { ENEMY_TYPES, POWER_UP_TYPES } from './data';

// ── Sprite factories ────────────────────────────────────────────────

function createSvgSprite(size: number, color: string, shape: 'rect' | 'circle'): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:absolute;width:${size}px;height:${size}px;pointer-events:none;`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  if (shape === 'circle') {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const r = size / 2;
    circle.setAttribute('cx', String(r));
    circle.setAttribute('cy', String(r));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', color);
    svg.appendChild(circle);
  } else {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', String(size));
    rect.setAttribute('height', String(size));
    rect.setAttribute('fill', color);
    svg.appendChild(rect);
  }

  wrapper.appendChild(svg);
  return wrapper;
}

// ── Sprite helpers ──────────────────────────────────────────────────

function attachSprite(entity: Entity, el: HTMLDivElement, container: HTMLElement): void {
  container.appendChild(el);
  entity.sprite = { el };
}

function removeSprite(entity: Entity): void {
  if (entity.sprite) {
    entity.sprite.el.remove();
  }
}

// ── Pipeline ────────────────────────────────────────────────────────

export function createRenderPipeline(container: HTMLElement): { teardown: Teardown; sync: System } {
  const teardowns: Teardown[] = [];

  // 5.1 — onEnter enemies: create sprite
  teardowns.push(onEnter(enemies, (entity) => {
    const def = ENEMY_TYPES.get(entity.enemyType ?? 'grunt');
    const size = def?.size ?? 20;
    const color = def?.color ?? '#e74c3c';
    const el = createSvgSprite(size, color, 'rect');
    attachSprite(entity, el, container);
  }));

  // 5.2 — onExit enemies: remove sprite
  teardowns.push(onExit(enemies, (entity) => {
    removeSprite(entity);
  }));

  // 5.3 — onEnter bullets: create sprite
  teardowns.push(onEnter(bullets, (entity) => {
    const el = createSvgSprite(8, '#ffffff', 'circle');
    attachSprite(entity, el, container);
  }));

  // 5.4 — onExit bullets: remove sprite
  teardowns.push(onExit(bullets, (entity) => {
    removeSprite(entity);
  }));

  // 5.5 — onEnter hoveredPowerUps: highlight
  teardowns.push(onEnter(hoveredPowerUps, (entity) => {
    if (entity.sprite) {
      entity.sprite.el.style.filter = 'brightness(1.8) drop-shadow(0 0 6px white)';
    }
  }));

  // 5.6 — onExit hoveredPowerUps: remove highlight
  teardowns.push(onExit(hoveredPowerUps, (entity) => {
    if (entity.sprite) {
      entity.sprite.el.style.filter = '';
    }
  }));

  // 5.7 — onEnter frozenEnemies: tint blue
  teardowns.push(onEnter(frozenEnemies, (entity) => {
    if (entity.sprite) {
      entity.sprite.el.style.filter = 'hue-rotate(180deg) saturate(2)';
    }
  }));

  // 5.8 — onExit frozenEnemies: restore
  teardowns.push(onExit(frozenEnemies, (entity) => {
    if (entity.sprite) {
      entity.sprite.el.style.filter = '';
    }
  }));

  // onEnter powerUps: create sprite
  teardowns.push(onEnter(powerUps, (entity) => {
    const def = POWER_UP_TYPES.get(entity.powerUpType ?? 'heal');
    const color = def?.color ?? '#2ecc71';
    const el = createSvgSprite(16, color, 'circle');
    attachSprite(entity, el, container);
  }));

  // onExit powerUps: remove sprite
  teardowns.push(onExit(powerUps, (entity) => {
    removeSprite(entity);
  }));

  // onEnter particles: create sprite
  teardowns.push(onEnter(particles, (entity) => {
    const el = createSvgSprite(4, '#ffcc00', 'circle');
    el.style.opacity = '0.8';
    attachSprite(entity, el, container);
  }));

  // onExit particles: remove sprite
  teardowns.push(onExit(particles, (entity) => {
    removeSprite(entity);
  }));

  // Polling: sync position → CSS transform
  const sync: System = () => {
    for (const entity of renderables) {
      const el = entity.sprite.el;
      const halfW = el.clientWidth / 2;
      const halfH = el.clientHeight / 2;
      el.style.transform = `translate(${entity.position.x - halfW}px, ${entity.position.y - halfH}px)`;
    }
  };

  const teardown: Teardown = () => {
    for (const td of teardowns) td();
  };

  return { teardown, sync };
}
