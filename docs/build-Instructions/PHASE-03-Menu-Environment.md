Phase 3: Menu Environment

**The vibe:** Player puts on headset and it feels like a real game lobby. Simple but polished. Correct colors, correct glow.

## Center Panel (FUNCTIONAL — this is the critical path)

3D panel floating at eye level, ~2m in front of player.

- **Song list:** Vertical list of 3-5 songs (the AI-generated tracks)
  - Each row: song name, BPM, duration
  - Highlight on laser hover (glow border, slight scale)
  - Select on trigger press
- **Difficulty selector:** Easy / Normal / Hard buttons below song info
  - Highlight on hover, select on trigger
  - Changes which beatmap variant loads
- **Play button:** Large, prominent, glowing
  - Hover highlights it
  - Trigger press → transition to `countdown` state

Implementation: Canvas textures on `PlaneGeometry` meshes. Render text and UI via 2D canvas, apply as `CanvasTexture`, update on state change. No HTML overlay — everything is in 3D.

## Left Panel (MOCK — lightweight)

Settings layout. Static content rendered once to a canvas texture:
- Volume slider (visual only)
- Player height (visual only)
- Color toggles (visual only)
- Left-handed mode toggle (visual only)

Responds to laser pointer hover (highlight effect) but does nothing functional.

## Right Panel (MOCK — lightweight)

Leaderboard/scores. Static content:
- 5-8 fake player entries with names and scores
- Current player highlighted

Responds to hover, no function.

## Menu Controllers

- Thin laser-pointer beam from each controller
- Raycast against UI panels each frame
- Visual feedback: beam dot where it hits, panel element highlights
- Trigger button = click/select
- **NOT the game sabers** — swap models when entering gameplay
