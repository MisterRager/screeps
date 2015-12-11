export default class CreepTypes {
  static worker() {
    return [CARRY, WORK, MOVE];
  }

  static fighter() {
    return [TOUGH, MOVE, MOVE, ATTACK];
  }
}
