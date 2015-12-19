export default class StateMachine {
  constructor(states = []) {
    this._states = states;
  }

  states() {
    return this._states = (this._states && this._states.length !== undefined)
      ? this._states : [];
  }

  addState(state) {
    this.states().push(state);
    return this;
  }

  defaultState() {
    return this.states().find((state) => state.defaultState());
  }

  currentState(creep, newState = undefined) {
    if (newState !== undefined
      && this.states().find((state) => state.name === newState.name)
    ) {
      creep.memory.current_state = newState.name;
      return newState;
    }

    const {current_state} = creep.memory;
    if (current_state) {
      const stateObj = this.states().find(
        (state) => state.name === current_state
      );

      if (stateObj) {
        return stateObj;
      }
    }

    return this.currentState(creep, this.defaultState());
  }

  resolveState(creep) {
    const currentState = this.currentState(creep);
    const newState = currentState.testChange(creep);
    if (newState) {
      const newStateObj = this.states().find((state) => state.name === newState);
      if (newStateObj) {
        return this.currentState(creep, newStateObj);
      }
    }
    return currentState;
  }
}
