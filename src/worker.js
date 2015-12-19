import CreepTypes from 'creep_types';

export const role = "worker";

export const BodyTiers = [
  [CARRY, WORK, MOVE],
  [CARRY, CARRY, WORK, WORK, MOVE]
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export function shouldBuildMore(data) {
  const {worker = 0, trucker = 0, harvester = 0} = data;
  return worker === 0 && trucker < 1 && harvester < 1;
}

export function energyDeficit(creep) {
  return creep.carryCapacity - creep.carry.energy;
}

export function needsEnergy(creep) {
  return energyDeficit(creep) > 0;
}

export function source(creep, newSource = undefined) {
  if (newSource && newSource.id) {
    creep.memory.source = newSource.id;
    return newSource;
  }

  if (creep.memory.source) {
    return Game.getObjectById(creep.memory.source);
  }
  return creep.pos.findClosestByPath(FIND_SOURCES);
}

export function spawn(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.spawn = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }

  if (creep.memory.spawn) {
    return Game.getObjectById(creep.memory.spawn);
  }
  return creep.pos.findClosestByPath(Game.MY_SPAWNS);
}

const RepositoryTypes = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN];

export function energyRepositories(creep) {
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

function nonFullRepository(repo) {
  return (repo.energy !== undefined) && repo.energyCapacity
    && repo.energyCapacity > repo.energy;
}

export function findDepository(creep) {
  const allRepos = energyRepositories(creep);
  const needyRepos = allRepos.filter(
    (repo) => nonFullRepository(repo)
  );

  if (needyRepos && needyRepos.length) {
    return creep.pos.findClosestByPath(needyRepos);
  }

  return creep.pos.findClosestByPath(allRepos);
}

export function findReturnTarget(creep, kwargs = {}) {
  const spoon = spawn(creep);
  const {ignoreRcl} = kwargs;

  const needRcl = !ignoreRcl && !!spoon.memory.levelRcl;

  if (needRcl && (Math.random() < 0.3333)) {
    return creep.room.controller;
  } else {
    const availableRepos = energyRepositories(creep).filter(
      (repo) => nonFullRepository(repo)
    );

    if (availableRepos && availableRepos.length) {
      return creep.pos.findClosestByPath(availableRepos);
    } else {
      return creep.room.controller;
    }
  }
  return null
}

export function returnTarget(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.returnTarget = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }
  const creepSpawn = spawn(creep);

  if (creep.memory.returnTarget) {
    return Game.getObjectById(creep.memory.returnTarget);
  }
  return null;
}

export function returnEnergyTo(creep, target) {
  const transferFn = [
    STRUCTURE_SPAWN, STRUCTURE_EXTENSION
  ].some(
    str => str === target.structureType
  ) ? "transferEnergy" : "upgradeController";
  return creep[transferFn](target);
}

function returnEnergy(creep) {
  const target = returnTarget(creep) || returnTarget(creep, findReturnTarget(creep));
  const res = returnEnergyTo(creep, target);

  switch (res) {
  case ERR_NOT_IN_RANGE:
    if (creep.moveTo(target) === ERR_NO_PATH) {
      returnTarget(creep, null);
    }
    break;
  case ERR_NOT_ENOUGH_RESOURCES:
  case ERR_FULL:
    returnTarget(creep, null);
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

export default function worker(creep) {
  const sauce = source(creep);
  if (returning(creep) || !needsEnergy(creep)) {
    returnEnergy(creep);
  } else {
    harvestEnergy(creep);
  }
}
