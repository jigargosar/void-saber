# Void Saber — Build Steps

Beat Saber clone. Babylon.js + WebXR. Quest browser + desktop.

1. Corridor — dark void, neon edge lines, glowing pillars, GlowLayer, fog
2. WebXR session — enter VR, corridor looks correct in headset
3. Controller tracking — see controller positions in VR
4. Sabers — blade + handle + glow, attached to controllers, cyan left magenta right
5. Saber trails — ribbon behind blade tip, fades along tail
6. Saber-saber sparks — detect intersection, spawn particles, haptic pulse
7. Audio engine — Web Audio API, synthesized kick/snare/hat/bass
8. Songs — 3-5 procedural tracks, different tempos
9. Beat clock — timing from AudioContext.currentTime, drives everything
10. Beatmaps — JSON, each note has time/lane/row/color/direction
11. Cube spawning — pooled rounded cubes, travel toward player, arrive on beat
12. Directional arrows — arrow on cube face showing required swing direction
13. Collision — saber vs cube, check swing direction matches
14. Cut particles — burst of mini cubes on hit, gravity, fade out
15. Haptics — pulse on hit, lighter on saber contact, nothing on miss
16. Scoring — hits/misses/streak, HUD display
17. Beat-reactive environment — pillars pulse, fog breathes, edges glow on beat
18. State machine — menu / countdown / playing / paused / results
19. Menu — song list, difficulty, play button, laser pointer interaction
20. Countdown — 3-2-1, swap controllers to sabers, start audio
21. Results screen — score, accuracy, retry/menu buttons
22. More content — additional songs, difficulty variants
23. Polish — tune timing, speeds, thresholds
