export default class ChangeCondition {
  constructor(stateName, creepTrigger) {
    this.stateName = stateName;
    this.creepTrigger = creepTrigger;
  }

  trigger(creep) {
    return this.creepTrigger && this.creepTrigger(creep);
  }

  newState() {
    return this.stateName;
  }
}
