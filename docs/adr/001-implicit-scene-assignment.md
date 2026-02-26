ADR-001: Implicit Scene Assignment
Date: 2026-02-26
Status: Accepted

# Context

Babylon.js requires a `scene` parameter when constructing nodes, meshes, and materials.
If omitted, the engine falls back to `EngineStore.LastCreatedScene` — a global singleton
tracking the most recently created scene.

We verified through isolated tests that:

1. `scene` in constructor only registers the node in scene arrays — it does not set `.parent`
2. Setting `.parent` does not transfer scene membership — child stays in its original scene
3. In a multi-scene setup, omitting `scene` silently registers nodes in the wrong scene
4. `dispose(false, true)` cascades correctly regardless of how scene was assigned

# Decision

Drop explicit `scene` parameters from all internal construction functions. Rely on
`LastCreatedScene` for automatic scene assignment.

# Trade-off

This violates "no spooky action at a distance" — scene membership depends on a hidden global.
If a second scene is ever introduced, nodes could silently register in the wrong scene.

We accept this because:

- The application has a single scene and no plans for multiple scenes
- Removing `scene` threading eliminates a parameter passed through every constructor call
- If multiple scenes are introduced, this ADR flags the known risk

# Consequences

- All `new TransformNode(name)`, `MeshBuilder.Create*(name, opts)`, and
  `new StandardMaterial(name)` calls omit the scene parameter
- A second scene would require revisiting every constructor call — this ADR serves as the marker
