import { Color3 } from '@babylonjs/core/Maths/math';

export type Hand = 'left' | 'right';

export interface Theme {
  leftHand:  Color3;
  rightHand: Color3;
}

export function handColor(theme: Theme, hand: Hand): Color3 {
  switch (hand) {
    case 'left':  return theme.leftHand;
    case 'right': return theme.rightHand;
  }
}
