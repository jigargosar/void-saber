Phase 14: Results Screen

Song ends → brief pause (1-2 seconds, music fades, last particles settle) → results appear.

3D panel in front of player (similar to menu panels):

```
╔══════════════════════════════╗
║        SONG COMPLETE         ║
║                              ║
║     ★ ★ ★ ☆ ☆              ║
║                              ║
║   Hits:     142 / 160        ║
║   Accuracy: 88%              ║
║   Max Streak: 47             ║
║                              ║
║   [ RETRY ]    [ MENU ]      ║
╚══════════════════════════════╝
```

- Star rating: simple thresholds (≥90% = 5 stars, ≥80% = 4, etc.)
- **Retry** → reload same song/difficulty, back to `countdown`
- **Menu** → tear down, back to `menu` state
- Both buttons respond to laser pointer hover + trigger
- Panel material: dark with subtle glow border matching theme
