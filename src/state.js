import ChangeCondition from 'change_condition';

export default class State {
  constructor(name, action) {
    this.name = name;
    this.action = action;
  }

  testChange(creep) {
    const changeTo = this.changeConditions().find((cond) => cond.trigger(creep));
    return changeTo ? changeTo.newState() : null;
  }

  markDefault() {
    this.default_state = true;
    return this;
  }

  defaultState() {
    return !!this.default_state;
  }

  changeConditions() {
    return this._conditions =
      (this._conditions && this._conditions.length !== undefined)
        ? this._conditions : [];
  }

  executeAction(creep) {
    this.action && this.action(creep);
  }

  addChangeCondition(changeCondition){
    this.changeConditions().push(changeCondition);
    return this;
  }
}
