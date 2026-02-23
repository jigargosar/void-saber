// Theme colors - HSL only
export const COLORS = {
  // Sabers and left cubes
  CYAN: new (require('three').Color)().setHSL(185 / 360, 1.0, 0.55),
  // Sabers and right cubes
  MAGENTA: new (require('three').Color)().setHSL(310 / 360, 1.0, 0.60),
  // Environment
  DARK_VOID: new (require('three').Color)().setHSL(0, 0, 0.05),
  NEON_WHITE: new (require('three').Color)().setHSL(0, 0, 1.0),
};

// Gameplay constants
export const GAMEPLAY = {
  // Cube spawn distance and speed
  CUBE_SPAWN_DISTANCE: 50,
  CUBE_SPEED: 15, // units per second
  CUBE_SIZE: 0.4,

  // Lane and row positions (4 lanes x 3 rows)
  LANES: [-0.6, -0.2, 0.2, 0.6],
  ROWS: [1.6, 1.2, 0.8], // top, middle, bottom

  // Hit detection window
  HIT_WINDOW_MS: 200,

  // Direction tolerance for swing detection
  DIRECTION_TOLERANCE: Math.PI / 3, // 60 degrees
};

// Audio constants
export const AUDIO = {
  DEFAULT_SAMPLE_RATE: 44100,
  KICK_FREQ_START: 150,
  KICK_FREQ_END: 40,
  KICK_DURATION: 0.1,
  SNARE_FILTER_FREQ: 1000,
  HAT_FILTER_FREQ: 7000,
  HAT_DURATION: 0.03,
};
