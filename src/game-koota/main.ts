import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3, Color3 } from '@babylonjs/core/Maths/math'
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience'

import '@babylonjs/core/Helpers/sceneHelpers'
import '@babylonjs/loaders/glTF'

import { type Theme } from '../theme'
import { type SaberCollisionEvent } from './types'
import { createEnvironment } from './environment'
import { createVisualPipeline } from './visual-pipeline'
import { gripBindSystem } from './grip-bind-system'
import { createTrailUpdateSystem } from './trail-update-system'
import { createSaberCollisionSystem } from './saber-collision-system'
import { handleSaberHaptics } from './saber-haptic-handler'
import { createSaberSparkHandler } from './saber-spark-handler'
import { bridgeInput } from './input-bridge'
import { generateSong } from '../music-engine'
import { createAudioPlayer } from '../game/audio-player'

// ── Theme ──────────────────────────────────────────────────────────

const cyan    = new Color3(0, 0.9, 0.95)
const magenta = new Color3(0.95, 0, 0.7)

const theme: Theme = {
  leftHand:  cyan,
  rightHand: magenta,
}

// ── Bootstrap ──────────────────────────────────────────────────────

function showVersion(): void {
  const el = document.createElement('div')
  el.textContent = 'v3-koota'
  el.style.cssText = 'position:fixed;top:8px;left:8px;color:#fff;font:14px monospace;opacity:0.5;z-index:9999;pointer-events:none'
  document.body.appendChild(el)
}

function createBabylonEngine(): Engine {
  const canvas = document.getElementById('canvas')
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas element not found')
  return new Engine(canvas, true)
}

function createScene(engine: Engine): Scene {
  const scene = new Scene(engine)
  const camera = new FreeCamera('cam', new Vector3(0, 1.6, 0), scene)
  camera.setTarget(new Vector3(0, 1.6, -100))
  camera.attachControl()
  return scene
}

async function setupWebXR(scene: Scene, env: ReturnType<typeof createEnvironment>): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: { sessionMode: 'immersive-vr' },
    disableTeleportation: true,
    disablePointerSelection: true,
    disableNearInteraction: true,
    disableHandTracking: true,
    inputOptions: { doNotLoadControllerMeshes: true },
  })

  const handleSaberSparks = createSaberSparkHandler(scene)

  // ── Event buffer (replaces createEventQueue) ──────────────────
  const collisionBuffer: SaberCollisionEvent[] = []

  function flushCollisions(): void {
    for (let i = 0; i < collisionBuffer.length; i++) {
      handleSaberHaptics(collisionBuffer[i])
      handleSaberSparks(collisionBuffer[i])
    }
    collisionBuffer.length = 0
  }

  // ── Lifecycle hooks (Koota onQueryAdd/onQueryRemove) ──────────
  const disposeVisuals = createVisualPipeline(theme)

  // ── Systems ───────────────────────────────────────────────────
  const engine = scene.getEngine()
  const getDelta = () => engine.getDeltaTime() / 1000

  const trailUpdate = createTrailUpdateSystem(getDelta)
  const collisionSystem = createSaberCollisionSystem((event) => collisionBuffer.push(event))
  const beatDecay = env.createBeatDecaySystem(getDelta)

  // ── Per-frame tick (replaces createPipeline) ──────────────────
  scene.onBeforeRenderObservable.add(() => {
    gripBindSystem()
    trailUpdate()
    collisionSystem()
    beatDecay()
    flushCollisions()
  })

  // ── Input bridge ──────────────────────────────────────────────
  const disposeInput = bridgeInput(xr.input)

  // Capture teardowns for future shutdown logic
  void disposeVisuals
  void disposeInput
}

async function main(): Promise<void> {
  showVersion()
  const engine = createBabylonEngine()
  const scene  = createScene(engine)

  const env = createEnvironment(scene, theme)

  const song = generateSong(42)
  const audio = createAudioPlayer(song, () => env.onBeat())
  const canvas = engine.getRenderingCanvas()
  if (canvas) {
    canvas.addEventListener('click', () => audio.start(), { once: true })
  }

  setupWebXR(scene, env).catch(console.error)

  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())
}

main().catch(console.error)
