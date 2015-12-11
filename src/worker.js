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

function spawnerExpansions(spawn) {
  return spawn.room.find(FIND_MY_STRUCTURES).filter((structure) => {
    return structure.structureType === STRUCTURE_EXTENSION;
  });
}

const RepositoryTypes = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN];

function energyRepositories(creep) {
  return creep.room.find(FIND_MY_STRUCTURES)
    .filter((structure) => {
      return RepositoryTypes.find(
        (sType) => sType === structure.structureType
      );
    });
}

export function adjacent(worker, to) {
  return worker.pos.isNearTo(to);
}

export function returning(creep) {
  return !!creep.memory.returnTarget;
}

function returnTarget(creep) {
  const creepSpawn = spawn(creep);
  const needRcl = !!creepSpawn.memory.levelRcl;

  if (creep.memory.returnTarget) {
    return Game.getObjectById(creep.memory.returnTarget);
  } else {
    let target = null;

    if (needRcl && (Math.random() < 0.25)) {
      target = creep.room.controller;
    } else {
      target = energyRepositories(creep).map(
        (structure) => {
          return {
            structure: structure,
            path: creep.pos.findPathTo(structure.pos)
          };
        }
      ).sort((first, second) => {
        return (first && first.path && first.path.length ?
          first.path.length : 0) -
          (second && second.path && second.path.length ?
            second.path.length : 0);
      }).map((sortable) => sortable.structure)[0];
    }

    if (target) {
      creep.memory.returnTarget = target.id;
    }
    return target;
  }
}

function returnEnergy(creep) {
  const target = returnTarget(creep);
  const transferFn = [
    STRUCTURE_SPAWN, STRUCTURE_EXTENSION
  ].some(
    str => str === target.structureType
  ) ? "transferEnergy" : "upgradeController";
  const res = creep[transferFn](target);

  switch (res) {
  case ERR_NOT_ENOUGH_RESOURCES:
    creep.memory.returnTarget = false;
    break;
  case ERR_NOT_IN_RANGE:
    if (creep.moveTo(target) === ERR_NO_PATH) {
      construct(creep);
    }
    break;
  case ERR_FULL:
    construct(creep);
    break;
  }
}

function harvestEnergy(creep) {
  const target = source(creep);
  const res = creep.harvest(target);

  switch (res) {
  case ERR_NOT_IN_RANGE:
    creep.moveTo(target);
    break;
  }
}

function constructing(creep) {
  return !!creep.memory.constructionSite;
}

function construct(creep, site = undefined) {
  if (creep.memory.ignoreConstruction) {
    creep.memory.ignoreConstruction = undefined;
  }

  let target = site;
  if (site) {
    creep.memory.constructionSite = site.id;
  } else {
    target = Game.getObjectById(creep.memory.constructionSite);
  }

  if (!target) {
    target = findNearbyConstruction(creep)[0];
  }

  if (target) {
    if (creep.memory.returnTarget) {
      creep.memory.returnTarget = undefined;
    }
    const res = creep.build(target);

    switch(res) {
    case ERR_NOT_IN_RANGE:
      creep.moveTo(target);
      break;
    case OK:
      // do nothing
      break;
    case ERR_NOT_ENOUGH_RESOURCES:
    default:
      creep.memory.constructionSite = undefined;
      creep.memory.ignoreConstruction = undefined;
    }
  } else {
    creep.memory.constructionSite = undefined;
    creep.memory.ignoreConstruction = undefined;
  }
}


function shouldDoSweep(creep, cooldownTicks = 6) {
  if (creep.memory.ignoreConstruction) {
    return false;
  } else if (creep.memory.ignoreConstruction === undefined) {
    creep.memory.ignoreConstruction = Math.random() > 0.4;
  }

  let cooldown = creep.memory.sweepCooldown || 0;
  if (--cooldown <= 0) {
    creep.memory.sweepCooldown = cooldownTicks;
    return true;
  }

  creep.memory.sweepCooldown = cooldown;
  return false;
}

function findNearbyConstruction(creep, range = 6) {
  if (shouldDoSweep(creep, range)) {
    return creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, range);
  } else {
    return [];
  }
}

export default function worker(creep) {
  if (constructing(creep)) {
    construct(creep);
  } else if (returning(creep) || !needsEnergy(creep)) {
    const construction = findNearbyConstruction(creep);
    if (construction.length) {
      construct(creep, construction[0]);
    } else {
      returnEnergy(creep);
    }
  } else {
    harvestEnergy(creep);
  }
}
