type StateTransitionFunction<EState, TArgs> = (currentState: EState, args: TArgs) => EState;

class StateMachine<EState, TArgs> {

    private currentState: EState;

    constructor(initialState: EState, private readonly transitionFunction: StateTransitionFunction<EState, TArgs>) {
        this.currentState = initialState;
        this.transitionFunction = transitionFunction;
    }

    public updateState(args: TArgs) {
        const newState = this.transitionFunction(this.currentState, args);
        this.currentState = newState;
    }

    public getState(): EState {
        return this.currentState;
    }
}
