export function full(creep) {
  const {energy = 0, power = 0} = creep.carry;
  return creep.carryCapacity <= (energy + power);
}

export function empty(creep) {
  const {energy = 0, power = 0} = creep.carry;
  return !(energy + power);
}

export function role(creep, newVal = undefined) {
  if (!creep) {
    return null;
  }
  if (newVal !== undefined) {
    console.log("Update role", creep.id, creep.memory.role, newVal);
    creep.memory.role = newVal;
  }
  return creep.memory.role;
}

export function isAt(creep, pos) {
  const {x: cX, y: cY} = creep.pos;
  const {x: pX, y: pY} = pos;

  return cX === pX && cY === pY;
}

function partCounts(creep) {
  return creep.body.reduce(
    (anMap,part) => {
      if(!anMap[part.type] || !anMap[part.type].length) {
        anMap[part.type] = 1;
      } else {
        anMap[part.type]++;
      }
      return anMap;
    },
    {}
  );
}

export function hasParts(creep, partsList) {
  const counts = partCounts(creep);
  return partsList.every((part) => !!counts[part]);
}

export function memoryValRelation(creep, name, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory[name] = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }

  return Game.getObjectById(creep.memory[name]);
}
