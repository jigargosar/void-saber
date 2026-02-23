export type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'results';

interface StateHandlers {
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (dt: number) => void;
}

class StateMachine {
  private currentState: GameState = 'menu';
  private handlers: Partial<Record<GameState, StateHandlers>> = {};

  setState(state: GameState) {
    if (state === this.currentState) return;

    // Exit current state
    const exitHandler = this.handlers[this.currentState];
    if (exitHandler?.onExit) {
      exitHandler.onExit();
    }

    // Transition
    this.currentState = state;

    // Enter new state
    const enterHandler = this.handlers[state];
    if (enterHandler?.onEnter) {
      enterHandler.onEnter();
    }
  }

  getState(): GameState {
    return this.currentState;
  }

  on(state: GameState, handlers: StateHandlers) {
    this.handlers[state] = handlers;
  }

  update(dt: number) {
    const handler = this.handlers[this.currentState];
    if (handler?.onUpdate) {
      handler.onUpdate(dt);
    }
  }
}

export const stateMachine = new StateMachine();
