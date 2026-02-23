Phase 2: State Machine

Simple finite state machine driving the entire app:

```
type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'results';
```

- `menu` — Show menu panels, laser pointer controllers
- `countdown` — 3-2-1 before song starts (brief, builds anticipation)
- `playing` — Game loop, sabers, cubes, scoring
- `paused` — Freeze game, show resume/quit (trigger via controller button)
- `results` — Show score, retry and menu buttons

State transitions tear down the old scene and build the new one. All cleanup is explicit — dispose geometries, stop audio, clear pools.
