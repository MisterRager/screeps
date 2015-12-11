export const role = "worker";

export function needsEnergy(creep) {
  return creep.carry.energy < creep.carryCapacity;
}

export function source(creep, newSource = undefined) {
  if (newSource && newSource.id) {
    creep.memory.source = newSource.id;
    return newSource;
  }

  if (creep.memory.source) {
    return Game.getObjectById(creep.memory.source);
  }
  return creep.pos.findClosestByPath(Game.FIND_SOURCES);
}

export function spawn(creep) {
  if (creep.memory.spawn) {
    return Game.getObjectById(creep.memory.spawn);
  }
  return creep.pos.findClosestByPath(Game.MY_SPAWNS);
}

export function adjacent(worker, to) {
  return worker.pos.isNearTo(to);
}

export default function worker(creep) {
  if (needsEnergy(creep)) {
    const sauce = source(creep);
    if (adjacent(creep, sauce)) {
      creep.harvest(sauce);
    } else {
      creep.moveTo(sauce);
    }
  } else {
    const spoon = spawn(creep);
    if (adjacent(creep, spoon)) {
      creep.transferEnergy(spoon);
    } else {
      creep.moveTo(spoon);
    }
  }
}
