import CreepTypes from 'creep_types';

export const role = "worker";

export const BodyTiers = [
  [CARRY, WORK, MOVE],
  [CARRY, CARRY, WORK, WORK, MOVE]
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

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
  return creep.pos.findClosestByPath(Game.FIND_SOURCES);
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

function returnTarget(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.returnTarget = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }
  const creepSpawn = spawn(creep);
  const needRcl = !!creepSpawn.memory.levelRcl;

  if (creep.memory.returnTarget) {
    return Game.getObjectById(creep.memory.returnTarget);
  } else {
    let target = null;
    if (needRcl && (Math.random() < 0.3333)) {
      target = creep.room.controller;
    } else {
      const availableRepos = energyRepositories(creep).filter(
        (repo) => nonFullRepository(repo)
      );

      if (availableRepos && availableRepos.length) {
        target = creep.pos.findClosestByPath(availableRepos);
      } else {
        target = creep.room.controller;
      }
    }

    return returnTarget(creep, target);
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
