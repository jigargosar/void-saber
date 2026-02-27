Game Math Libraries

Evaluated libraries for vector math, collision detection, physics, and general math.
Useful as reference for current and future game development needs.

## Vector Math

### gl-matrix (v4)
- https://glmatrix.net/docs/v4/
- https://github.com/toji/gl-matrix
- Functional API (`vec2.add()`, `vec2.distance()`, `vec2.scale()`) + class dual
- TypeScript native in v4, tree-shakeable ESM, zero dependencies
- 2D/3D/4D vectors, matrices, quaternions
- Battle-tested in WebGL/game communities
- Best fit for: plain-object vector operations in ECS components

### @thi.ng/vectors
- https://github.com/thi-ng/umbrella/tree/develop/packages/vectors
- https://www.npmjs.com/package/@thi.ng/vectors
- ~900 functions, functional output-first API
- Works with any ArrayLike container (plain arrays, typed arrays)
- Per-function tree-shaking, fixed-size loop-free 2D/3D/4D variants
- 8 dependencies (@thi.ng ecosystem)
- Best fit for: projects already in @thi.ng ecosystem or needing extensive vector operations

## Collision Detection

### check2d
- https://github.com/nenjack/check2d
- Feature-complete 2D collision detection (not physics)
- Shapes: boxes, circles, ellipses, polygons, lines, points
- BVH broad-phase + SAT narrow-phase
- Raycasting, rotation, scaling, group-based filtering
- OOP API, TypeScript, canvas debug tools
- Best fit for: 2D collision detection without physics simulation

## Physics Engines

### planck.js
- https://piqnt.github.io/planck.js/docs/api/
- https://github.com/piqnt/planck.js
- 2D physics engine (Box2D port to TypeScript)
- Bodies, fixtures, joints, collision detection + response
- Vec2/Vec3, Mat22/Mat33, Transform, Rot utilities
- Best fit for: full 2D physics simulation (gravity, forces, constraints)

### matter-js
- https://github.com/liabru/matter-js
- 2D rigid body physics engine
- Bodies, composites, constraints, collision, gravity, friction
- 18k+ GitHub stars, widely adopted
- Best fit for: full 2D physics with broad community support

## General Math

### mathjs
- https://mathjs.org/docs/reference/
- https://github.com/josdejong/mathjs
- Extensive general-purpose math library
- Numbers, BigNumbers, complex numbers, fractions, units, matrices
- Expression parser with symbolic computation
- Functional API, TypeScript types, tree-shakeable via dependency injection
- Best fit for: general math beyond vectors (symbolic computation, units, expression parsing)
