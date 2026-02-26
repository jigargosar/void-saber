import assert from 'node:assert/strict';
import { observable, autorun, computed, runInAction } from 'mobx';
import { createTransformer, queueProcessor, fromResource } from 'mobx-utils';

// 1. createTransformer — memoizes: same input returns same output
{
  let callCount = 0;
  const transform = createTransformer((input) => {
    callCount++;
    return { doubled: input.value * 2 };
  });

  const obj = observable({ value: 5 });
  let result1, result2;
  const dispose = autorun(() => {
    result1 = transform(obj);
  });
  const firstCallCount = callCount;
  // Access again in same reaction cycle — should be memoized
  const dispose2 = autorun(() => {
    result2 = transform(obj);
  });
  assert.equal(result1, result2, 'same input returns same cached output');
  assert.equal(firstCallCount, 1, 'transformer ran exactly once for same input');
  dispose();
  dispose2();
}
console.log('1. createTransformer memoizes — same input, same output');

// 2. createTransformer — re-runs when observable input changes
{
  const obj = observable({ value: 5 });
  let callCount = 0;
  const transform = createTransformer((input) => {
    callCount++;
    return { doubled: input.value * 2 };
  });

  let result;
  const dispose = autorun(() => {
    result = transform(obj);
  });
  assert.equal(result.doubled, 10);
  assert.equal(callCount, 1);

  runInAction(() => { obj.value = 10; });
  assert.equal(result.doubled, 20, 'result updated after observable change');
  assert.equal(callCount, 2, 'transformer re-ran');
  dispose();
}
console.log('2. createTransformer re-runs when observable input changes');

// 3. createTransformer — onCleanup fires when no longer observed
{
  let cleaned = null;
  const transform = createTransformer(
    (input) => ({ name: input.name + '_mesh' }),
    (result, input) => { cleaned = result; }
  );

  const obj = observable({ name: 'saber' });
  const dispose = autorun(() => {
    transform(obj);
  });
  assert.equal(cleaned, null, 'not cleaned up yet');
  dispose(); // stop observing
  assert.notEqual(cleaned, null, 'onCleanup should fire after dispose');
  assert.equal(cleaned.name, 'saber_mesh', 'cleanup receives the result');
}
console.log('3. createTransformer onCleanup fires when no longer observed');

// 4. createTransformer — cleanup fires when entity removed from observable array
{
  const entities = observable([
    { id: 1, name: 'saber_left' },
    { id: 2, name: 'saber_right' },
  ]);
  const cleanedUp = [];
  const transform = createTransformer(
    (entity) => ({ mesh: entity.name + '_mesh' }),
    (result) => { cleanedUp.push(result.mesh); }
  );

  const dispose = autorun(() => {
    entities.map(e => transform(e));
  });
  assert.equal(cleanedUp.length, 0, 'nothing cleaned up yet');

  runInAction(() => { entities.splice(0, 1); }); // remove first entity
  assert.equal(cleanedUp.length, 1, 'one entity cleaned up');
  assert.equal(cleanedUp[0], 'saber_left_mesh', 'correct entity cleaned up');
  dispose();
}
console.log('4. createTransformer cleanup fires when entity removed from array');

// 5. queueProcessor — processes items pushed to observable array
{
  const queue = observable([]);
  const processed = [];
  const dispose = queueProcessor(queue, (item) => {
    processed.push(item);
  });

  runInAction(() => { queue.push({ type: 'collision', point: { x: 1 } }); });
  assert.equal(processed.length, 1, 'processed one item');
  assert.equal(processed[0].type, 'collision');

  runInAction(() => {
    queue.push({ type: 'haptic' });
    queue.push({ type: 'spark' });
  });
  assert.equal(processed.length, 3, 'processed all three items');
  dispose();
}
console.log('5. queueProcessor processes items pushed to observable array');

// 6. queueProcessor — items are consumed (removed from array)
{
  const queue = observable([]);
  const dispose = queueProcessor(queue, () => {});
  runInAction(() => { queue.push('a', 'b', 'c'); });
  assert.equal(queue.length, 0, 'items consumed from array after processing');
  dispose();
}
console.log('6. queueProcessor consumes items from array');

// 7. fromResource — subscribes and provides value
{
  let sinkFn = null;
  const resource = fromResource(
    (sink) => { sinkFn = sink; },
    () => {}
  );

  let observed = undefined;
  const dispose = autorun(() => {
    observed = resource.current();
  });
  assert.equal(observed, undefined, 'initial value is undefined');

  sinkFn({ hand: 'left', grip: 'grip_node' });
  assert.deepEqual(observed, { hand: 'left', grip: 'grip_node' }, 'value updated via sink');
  dispose();
}
console.log('7. fromResource subscribes and provides value via sink');

// 8. fromResource — unsubscribes when no longer observed
{
  let subscribed = false;
  let unsubscribed = false;
  const resource = fromResource(
    (sink) => { subscribed = true; sink('data'); },
    () => { unsubscribed = true; }
  );

  assert.equal(subscribed, false, 'not subscribed before observation');
  const dispose = autorun(() => { resource.current(); });
  assert.equal(subscribed, true, 'subscribed when observed');
  assert.equal(unsubscribed, false, 'not unsubscribed while observed');
  dispose();
  assert.equal(unsubscribed, true, 'unsubscribed after observation ends');
}
console.log('8. fromResource unsubscribes when no longer observed');

// 9. Multiple queueProcessors on same queue — both fire
{
  const queue = observable([]);
  const log1 = [];
  const log2 = [];
  const d1 = queueProcessor(queue, (item) => { log1.push(item); });
  const d2 = queueProcessor(queue, (item) => { log2.push(item); });
  runInAction(() => { queue.push('event'); });
  // queueProcessor consumes items, so second processor may not see them
  const totalProcessed = log1.length + log2.length;
  console.log(`   (log1: ${log1.length}, log2: ${log2.length}) — ${
    totalProcessed >= 2 ? 'both fired' : 'only one fired — queue is single-consumer'
  }`);
  d1();
  d2();
}
console.log('9. queueProcessor single vs multi consumer (informational)');

// 10. createTransformer — different inputs produce different outputs
{
  const transform = createTransformer((input) => ({ id: input.id, mesh: input.id + '_mesh' }));
  const a = observable({ id: 'left' });
  const b = observable({ id: 'right' });
  let resultA, resultB;
  const dispose = autorun(() => {
    resultA = transform(a);
    resultB = transform(b);
  });
  assert.notEqual(resultA, resultB, 'different inputs produce different outputs');
  assert.equal(resultA.mesh, 'left_mesh');
  assert.equal(resultB.mesh, 'right_mesh');
  dispose();
}
console.log('10. createTransformer — different inputs, different cached outputs');

console.log('\nAll MobX/mobx-utils assertions passed.');
