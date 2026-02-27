import { trait } from 'koota'
import { type WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource'
import { type Mesh } from '@babylonjs/core/Meshes/mesh'
import { type Hand } from '../theme'
import { type SaberVisual, type TrailBuffers } from './types'

// ── Schema traits (SoA — numeric data) ──────────────────────────

// (none yet — future: position, velocity for beats)

// ── Callback traits (AoS — object references) ───────────────────

/** Which hand this controller is for. */
export const HandTrait = trait((): Hand => 'left')

/** WebXR input source for this controller. */
export const InputSource = trait(() => null as WebXRInputSource | null)

/** Saber visual attached to this controller. */
export const Saber = trait(() => null as SaberVisual | null)

/** Trail ribbon mesh. */
export const TrailMesh = trait(() => null as Mesh | null)

/** Trail vertex buffer data. */
export const TrailData = trait(() => null as TrailBuffers | null)

// ── Tag traits ──────────────────────────────────────────────────

/** Saber is parented to grip and trail is running. */
export const GripBound = trait()
