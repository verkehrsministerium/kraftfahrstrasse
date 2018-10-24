export type StateTransitionFunction<EState, TArgs> = (currentState: EState, args: TArgs) => EState;

export class StateMachine<EState, TArgs> {
  private currentState: EState;

  constructor(initialState: EState, private readonly transitionFunction: StateTransitionFunction<EState, TArgs>) {
    this.currentState = initialState;
    this.transitionFunction = transitionFunction;
  }

  public update(args: TArgs) {
    const newState = this.transitionFunction(this.currentState, args);
    this.currentState = newState;
  }

  public getState(): EState {
    return this.currentState;
  }
}
