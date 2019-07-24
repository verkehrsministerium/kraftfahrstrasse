export type StateTransitionFunction<EState, TArgs> = (args: TArgs) => EState | null;

export class StateMachine<EState, TArgs> {
  private currentState: EState;

  constructor(
    initialState: EState,
    private readonly transitionMap: Map<EState, StateTransitionFunction<EState, TArgs>>,
  ) {
    this.currentState = initialState;
  }

  public update(args: TArgs) {
    const stateTransition = this.transitionMap.get(this.currentState);
    if (!stateTransition) {
      return;
    }
    const newState = stateTransition(args) || this.currentState;
    this.currentState = newState;
  }

  public getState(): EState {
    return this.currentState;
  }
}
