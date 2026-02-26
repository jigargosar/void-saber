import assert from 'node:assert/strict';
import { World } from 'miniplex';

// 1. Entity creation — plain objects
{
  const world = new World();
  const entity = world.add({ position: { x: 0, y: 0 }, name: 'player' });
  assert.equal(entity.name, 'player');
  assert.equal(world.size, 1);
}
console.log('1. Entity creation — plain objects');

// 2. with() query matches entities that have the component
{
  const world = new World();
  world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  world.add({ position: { x: 5, y: 5 } }); // no velocity
  const moving = world.with('position', 'velocity');
  assert.equal(moving.size, 1, 'only one entity has both position and velocity');
}
console.log('2. with() query matches entities with required components');

// 3. without() query excludes entities that have the component
{
  const world = new World();
  world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  world.add({ position: { x: 5, y: 5 } });
  const idle = world.with('position').without('velocity');
  assert.equal(idle.size, 1, 'only one entity lacks velocity');
}
console.log('3. without() query excludes correctly');

// 4. addComponent triggers reindexing into queries
{
  const world = new World();
  const entity = world.add({ position: { x: 0, y: 0 } });
  const moving = world.with('position', 'velocity');
  assert.equal(moving.size, 0, 'entity not in moving query yet');
  world.addComponent(entity, 'velocity', { x: 1, y: 0 });
  assert.equal(moving.size, 1, 'entity now in moving query after addComponent');
}
console.log('4. addComponent triggers reindexing into queries');

// 5. removeComponent triggers reindexing out of queries
{
  const world = new World();
  const entity = world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  const moving = world.with('position', 'velocity');
  assert.equal(moving.size, 1);
  world.removeComponent(entity, 'velocity');
  assert.equal(moving.size, 0, 'entity removed from moving query after removeComponent');
}
console.log('5. removeComponent triggers reindexing out of queries');

// 6. onEntityAdded fires when entity matches query
{
  const world = new World();
  const moving = world.with('position', 'velocity');
  let added = null;
  moving.onEntityAdded.subscribe((entity) => { added = entity; });
  const entity = world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  assert.equal(added, entity, 'onEntityAdded should fire with the entity');
}
console.log('6. onEntityAdded fires when entity matches query');

// 7. onEntityRemoved fires when component removed makes entity leave query
{
  const world = new World();
  const moving = world.with('position', 'velocity');
  let removed = null;
  moving.onEntityRemoved.subscribe((entity) => { removed = entity; });
  const entity = world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  world.removeComponent(entity, 'velocity');
  assert.equal(removed, entity, 'onEntityRemoved should fire when entity leaves query');
}
console.log('7. onEntityRemoved fires when entity leaves query');

// 8. onEntityAdded fires when addComponent makes entity enter query
{
  const world = new World();
  const moving = world.with('position', 'velocity');
  let added = null;
  moving.onEntityAdded.subscribe((entity) => { added = entity; });
  const entity = world.add({ position: { x: 0, y: 0 } });
  assert.equal(added, null, 'not yet in query');
  world.addComponent(entity, 'velocity', { x: 1, y: 0 });
  assert.equal(added, entity, 'onEntityAdded fires after addComponent');
}
console.log('8. onEntityAdded fires via addComponent');

// 9. world.remove removes entity from all queries
{
  const world = new World();
  const entity = world.add({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });
  const withPos = world.with('position');
  const moving = world.with('position', 'velocity');
  assert.equal(withPos.size, 1);
  assert.equal(moving.size, 1);
  world.remove(entity);
  assert.equal(withPos.size, 0, 'removed from withPos query');
  assert.equal(moving.size, 0, 'removed from moving query');
  assert.equal(world.size, 0, 'removed from world');
}
console.log('9. world.remove removes entity from all queries');

// 10. Marker components (tags) — boolean true as component value
{
  const world = new World();
  const entity = world.add({ position: { x: 0, y: 0 }, gripBound: true });
  const bound = world.with('gripBound');
  const unbound = world.with('position').without('gripBound');
  assert.equal(bound.size, 1, 'marker component works as tag');
  assert.equal(unbound.size, 0, 'without excludes tagged entity');
}
console.log('10. Marker components (tags) work');

// 11. Query chaining — with().without() creates derived query
{
  const world = new World();
  world.add({ blade: {}, input: {}, gripBound: true });
  world.add({ blade: {}, input: {} });  // no gripBound
  world.add({ input: {} });  // no blade
  const needsSetup = world.with('blade', 'input').without('gripBound');
  assert.equal(needsSetup.size, 1, 'only entity with blade+input but no gripBound');
}
console.log('11. Query chaining — state-based detection pattern');

console.log('\nAll miniplex assertions passed.');
