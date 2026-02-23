export type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'results';

interface StateTransitionCallbacks {
  onEnter?: () => void | Promise<void>;
  onExit?: () => void | Promise<void>;
}

class StateMachine {
  private currentState: GameState = 'menu';
  private callbacks = new Map<GameState, StateTransitionCallbacks>();

  constructor() {
    this.callbacks.set('menu', {});
    this.callbacks.set('countdown', {});
    this.callbacks.set('playing', {});
    this.callbacks.set('paused', {});
    this.callbacks.set('results', {});
  }

  getCurrentState(): GameState {
    return this.currentState;
  }

  isState(state: GameState): boolean {
    return this.currentState === state;
  }

  on(state: GameState, callbacks: StateTransitionCallbacks): void {
    this.callbacks.set(state, callbacks);
  }

  async transition(nextState: GameState): Promise<void> {
    if (nextState === this.currentState) return;

    const exitCallbacks = this.callbacks.get(this.currentState);
    if (exitCallbacks?.onExit) {
      await exitCallbacks.onExit();
    }

    this.currentState = nextState;

    const enterCallbacks = this.callbacks.get(this.currentState);
    if (enterCallbacks?.onEnter) {
      await enterCallbacks.onEnter();
    }
  }
}

export const stateMachine = new StateMachine();
