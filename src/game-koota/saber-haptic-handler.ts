import { type SaberCollisionEvent } from './types'

const HAPTIC_INTENSITY = 0.3
const HAPTIC_DURATION_MS = 40

export function handleSaberHaptics(event: SaberCollisionEvent): void {
  pulseGamepad(event.inputA)
  pulseGamepad(event.inputB)
}

function pulseGamepad(source: SaberCollisionEvent['inputA']): void {
  const actuator = source.inputSource.gamepad?.vibrationActuator
  if (!actuator) return
  actuator.playEffect('dual-rumble', {
    duration: HAPTIC_DURATION_MS,
    strongMagnitude: HAPTIC_INTENSITY,
    weakMagnitude: HAPTIC_INTENSITY,
  }).catch(console.error)
}
