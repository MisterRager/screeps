export function full(creep) {
  const {energy = 0, power = 0} = creep.carry;
  return creep.carryCapacity <= (energy + power);
}

export function empty(creep) {
  const {energy = 0, power = 0} = creep.carry;
  return !(energy + power);
}

export function role(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.role = newVal;
  }
  return creep.memory.role;
}

export function isAt(creep, pos) {
  const {x: cX, y: cY} = creep.pos;
  const {x: pX, y: pY} = pos;

  return cX === pX && cY === pY;
}
