import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Observable } from '@babylonjs/core/Misc/observable.js';
import { observable, autorun, runInAction } from 'mobx';
import { createTransformer, fromResource } from 'mobx-utils';
import { World } from 'miniplex';

const engine = new NullEngine();
const scene = new Scene(engine);

// ============================================================
// 1. createTransformer + Babylon meshes — onCleanup disposes
// ============================================================
{
  const entityToMesh = createTransformer(
    (entity) => {
      const root = new TransformNode(entity.name, scene);
      const mat = new StandardMaterial(`${entity.name}Mat`, scene);
      const mesh = MeshBuilder.CreateCylinder(`${entity.name}Mesh`, {
        height: 1, diameter: 0.04, tessellation: 12,
      }, scene);
      mesh.material = mat;
      mesh.parent = root;
      return root;
    },
    (root) => {
      root.dispose(false, true);
    }
  );

  const entities = observable([
    { name: 'saber_left' },
    { name: 'saber_right' },
  ]);

  const dispose = autorun(() => {
    entities.map(e => entityToMesh(e));
  });

  const meshesBefore = scene.meshes.map(m => m.name);
  const matsBefore = scene.materials.map(m => m.name);
  assert.ok(meshesBefore.includes('saber_leftMesh'), 'left mesh created');
  assert.ok(meshesBefore.includes('saber_rightMesh'), 'right mesh created');
  assert.ok(matsBefore.includes('saber_leftMat'), 'left material created');
  assert.ok(matsBefore.includes('saber_rightMat'), 'right material created');

  // Remove left saber entity
  runInAction(() => { entities.splice(0, 1); });

  const meshesAfter = scene.meshes.map(m => m.name);
  const matsAfter = scene.materials.map(m => m.name);
  assert.ok(!meshesAfter.includes('saber_leftMesh'), 'left mesh disposed');
  assert.ok(!matsAfter.includes('saber_leftMat'), 'left material disposed');
  assert.ok(meshesAfter.includes('saber_rightMesh'), 'right mesh still alive');
  assert.ok(matsAfter.includes('saber_rightMat'), 'right material still alive');

  dispose();

  // After dispose, remaining mesh should also be cleaned up
  const meshesFinal = scene.meshes.map(m => m.name);
  assert.ok(!meshesFinal.includes('saber_rightMesh'), 'right mesh disposed after autorun ends');
}
console.log('1. createTransformer + Babylon meshes — onCleanup disposes correctly');

// ============================================================
// 2. fromResource + Babylon Observable — bridge works
// ============================================================
{
  const babylonObservable = new Observable();

  const controllerResource = fromResource(
    (sink) => {
      babylonObservable.add((data) => sink(data));
    },
    () => { babylonObservable.clear(); }
  );

  let observed = undefined;
  const dispose = autorun(() => {
    observed = controllerResource.current();
  });

  assert.equal(observed, undefined, 'no value before notification');

  babylonObservable.notifyObservers({ hand: 'left', grip: 'grip_L' });
  assert.deepEqual(observed, { hand: 'left', grip: 'grip_L' }, 'value bridged from Babylon observable');

  babylonObservable.notifyObservers({ hand: 'right', grip: 'grip_R' });
  assert.deepEqual(observed, { hand: 'right', grip: 'grip_R' }, 'updated on second notification');

  dispose();
  assert.equal(babylonObservable.observers.length, 0, 'Babylon observable cleared on unsubscribe');
}
console.log('2. fromResource + Babylon Observable — bridge works, auto-unsubscribes');

// ============================================================
// 3. MobX overhead in simulated 60fps loop
// ============================================================
{
  const entity = observable({ x: 0, y: 0, z: 0 });
  let readCount = 0;

  const dispose = autorun(() => {
    // Simulate hot path read — like trail system reading position
    const _ = entity.x + entity.y + entity.z;
    readCount++;
  });

  const FRAMES = 1000;
  const start = performance.now();
  for (let i = 0; i < FRAMES; i++) {
    runInAction(() => {
      entity.x = Math.random();
      entity.y = Math.random();
      entity.z = Math.random();
    });
  }
  const elapsed = performance.now() - start;
  const perFrame = elapsed / FRAMES;

  dispose();

  // At 60fps we have ~16.67ms per frame budget
  assert.ok(perFrame < 1, `observable read+write should be <1ms per frame, got ${perFrame.toFixed(3)}ms`);
  assert.equal(readCount, FRAMES + 1, 'autorun fired for every frame plus initial');
  console.log(`   ${FRAMES} frames in ${elapsed.toFixed(1)}ms (${perFrame.toFixed(3)}ms/frame)`);
}
console.log('3. MobX overhead in 60fps loop — well within budget');

// ============================================================
// 4. Miniplex + createTransformer — entity removal triggers cleanup
// ============================================================
{
  const scene2 = new Scene(engine);
  const world = new World();
  const cleanedUp = [];

  const entityToVisual = createTransformer(
    (entity) => {
      const root = new TransformNode(entity.name, scene2);
      const mat = new StandardMaterial(`${entity.name}Mat`, scene2);
      const mesh = MeshBuilder.CreateBox(`${entity.name}Box`, {}, scene2);
      mesh.material = mat;
      mesh.parent = root;
      return root;
    },
    (root) => {
      cleanedUp.push(root.name);
      root.dispose(false, true);
    }
  );

  // Bridge: miniplex query events → MobX observable array
  // MUST use { deep: false } — MobX wraps items in proxies by default,
  // breaking indexOf identity checks. Shallow array observes mutations
  // (push/splice) but preserves object references.
  const entityList = observable.array([], { deep: false });
  const withBlade = world.with('blade');

  withBlade.onEntityAdded.subscribe((entity) => {
    runInAction(() => entityList.push(entity));
  });
  withBlade.onEntityRemoved.subscribe((entity) => {
    runInAction(() => {
      const idx = entityList.indexOf(entity);
      if (idx >= 0) entityList.splice(idx, 1);
    });
  });

  // Autorun maps observable entity list to visuals via createTransformer
  const dispose = autorun(() => {
    entityList.map(e => entityToVisual(e));
  });

  // Add entities AFTER bridge is set up
  const e1 = world.add({ name: 'saber_left', blade: { base: {}, tip: {} } });
  const e2 = world.add({ name: 'saber_right', blade: { base: {}, tip: {} } });

  assert.ok(scene2.meshes.some(m => m.name === 'saber_leftBox'), 'left mesh exists');
  assert.ok(scene2.meshes.some(m => m.name === 'saber_rightBox'), 'right mesh exists');

  // Remove entity from world → triggers onEntityRemoved → updates observable
  // → autorun re-runs → createTransformer cleans up orphaned mesh
  world.remove(e1);

  assert.ok(cleanedUp.includes('saber_left'), 'left visual cleaned up after entity removal');
  assert.ok(!scene2.meshes.some(m => m.name === 'saber_leftBox'), 'left mesh disposed');
  assert.ok(scene2.meshes.some(m => m.name === 'saber_rightBox'), 'right mesh still alive');

  dispose();
  scene2.dispose();
}
console.log('4. Miniplex + createTransformer — entity removal triggers cleanup via reactive chain');

console.log('\nAll integration assertions passed.');
