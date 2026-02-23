Phase 13: Scoring

Core scoring is simple hit/miss:

```typescript
interface GameScore {
  hits: number;
  misses: number;
  totalNotes: number;
  streak: number;        // current consecutive hits
  maxStreak: number;     // best streak this song
}
```

- Hit → `hits++`, `streak++`, update `maxStreak`
- Miss → `misses++`, `streak = 0`
- Percentage = `hits / totalNotes * 100`

## In-Game HUD

- Floating score text above and behind the play area (not blocking view)
- Current hits / total in small text
- Streak counter if > 5 (subtle, doesn't distract)
- Use canvas texture on a `PlaneGeometry` — update canvas on score change
