Phase 5: Beatmap Format

Simple, custom, minimal.

```typescript
interface BeatmapNote {
  time: number;       // seconds from song start (when cube arrives at player)
  lane: number;       // 0-3 (left to right column)
  row: number;        // 0-2 (bottom, middle, top)
  color: 'left' | 'right';  // which saber should hit it
  direction: Direction;      // up, down, left, right, up-left, up-right, down-left, down-right
}

type Direction = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';

interface Beatmap {
  songId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  notes: BeatmapNote[];
}
```

- **4 columns (lanes)** × **3 rows** = 12 possible positions (standard Beat Saber grid)
- Each note knows its arrival time, position, color, and required swing direction
- Easy maps: few notes, mostly down/up cuts, wide spacing
- Hard maps: more notes, complex directions, tighter timing
- Maps are hand-authored JSON files — simple arrays of note objects

## Spawn Mechanics

- Cubes spawn at a far Z distance (~40-60 units away)
- Travel toward player at constant speed
- Speed is calculated so that cube arrives at the player exactly at `note.time`
- `spawnTime = note.time - (spawnDistance / cubeSpeed)`
- Pre-compute all spawn times at song load
