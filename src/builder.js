import CreepTypes from 'creep_types';
import * as Worker from 'worker';
import {underAttack} from 'room';
import State from 'state';
import ChangeCondition from 'change_condition';
import StateMachine from 'state_machine';
import * as Creep from 'creep';

export const role = "builder";

export const BodyTiers = [
  [CARRY, WORK, MOVE],
  [CARRY, CARRY, WORK, WORK, MOVE]
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export const WarStructures = [
  STRUCTURE_RAMPART,
  STRUCTURE_TOWER,
];

export function shouldBuildMore(data) {
  const {
    trucker = 0,
    harvester = 0,
    builder = 0,
    worker = 0
  } = data;
  return ((trucker + harvester + builder + worker) === 0)
    || (Math.floor(trucker / 3) > builder);
}

function findConstructionSite(creep) {
  if (!underAttack(creep.room)) {
    return creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
  }

  const allSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (allSites && allSites.length) {
    const warSites = allSites.filter(
      (site) => WarStructures.find(
        (structureName) => site.structureType === structureName
      )
    );

    if (warSites && warSites.length) {
      return creep.pos.findClosestByPath(warSites);
    }
  }

  return null;
}

function constructionSite(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.constructionSite = newVal && newVal.id ? newVal.id : newVal;
    return newVal;
  }
  if (creep.memory.constructionSite) {
    return Game.getObjectById(creep.memory.constructionSite);
  }

  return null;
}

function build(creep, site) {
  const res = creep.build(site);
  //console.log("Building...", creep, site, res);

  switch(res) {
  case ERR_NOT_IN_RANGE:
    creep.moveTo(site);
    break;
  case OK:
    // do nothing
    break;
  case ERR_NOT_ENOUGH_RESOURCES:
    // sets creep energy source
    replenish(creep, energyRepository(creep, findEnergyRepository(creep)));
    break;
  default:
  }
}

export function isBuilding(creep) {
  return !!creep.memory.constructionSite;
}

function isReplenishing(creep, newVal = undefined) {
  return !!creep.memory.energyRepository;
}

function isFull(creep) {
  return !Worker.needsEnergy(creep);
}

function findEnergyRepository(creep) {
  const sourceTriples = Worker.energyRepositories(creep).map(
    (repo) => {
      return [
        repo,
        creep.pos.findPathTo(repo).length,
        repo.energy
      ];
    }
  ).sort(
    (triple1, triple2) =>  triple1[1] - triple2[1]
  );


  let result = null;
  let energyLevel = 50;
  while (!result || energyLevel > 0) {
    result = sourceTriples.find((triple) => triple[2] >= energyLevel);
    energyLevel -= 5;
  }

  return result[0];
}

function energyRepository(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.energyRepository = newVal && newVal.id ? newVal.id : newVal;
    return newVal;
  }

  if (creep.memory.energyRepository) {
    return Game.getObjectById(creep.memory.energyRepository);
  }

  return null;
}

function replenish(creep, repo) {
  switch(repo.transferEnergy(creep, Worker.energyDeficit(creep))) {
  case ERR_NOT_IN_RANGE:
    creep.moveTo(repo.pos);
    break;
  case ERR_NOT_ENOUGH_RESOURCES:
    // find something not empty
    energyRepository(creep, findEnergyRepository(creep));
    break;
  }
}

export const Machine = new StateMachine()
  .addState(
    new State("replenishing", (creep) => {
      const repo = energyRepository(creep)
        || energyRepository(creep, findEnergyRepository(creep));
      if (Worker.adjacent(creep, repo.pos)) {
        replenish(creep, repo);
      } else {
        creep.moveTo(repo.pos);
      }
    })
      .markDefault()
      .addChangeCondition(
        new ChangeCondition("building", (creep) => {
          return Creep.full(creep) && !!(
            constructionSite(creep)
              || constructionSite(creep, findConstructionSite(creep))
          );
        })
      )
      .addChangeCondition(
        new ChangeCondition("levelRcl", (creep) => {
          return Creep.full(creep) && !(
            constructionSite(creep)
              || constructionSite(creep, findConstructionSite(creep))
          );
        })
      )
  )
  .addState(
    new State("building",
      (creep) => build(
        creep,
        constructionSite(creep)
          || constructionSite(creep, findConstructionSite(creep))
      )
    )
      .addChangeCondition(
        new ChangeCondition("replenishing", (creep) => Creep.empty(creep))
      )
  )
  .addState(
    new State("levelRcl", (creep) => {
      if (!Worker.adjacent(creep, creep.room.controller.pos)) {
        creep.moveTo(creep.room.controller.pos);
      } else {
        Worker.returnEnergyTo(creep, creep.room.controller);
      }
    })
      .addChangeCondition(
        new ChangeCondition("replenishing", (creep) => Creep.empty(creep))
      )
  );

export default function builder(creep) {
  const currentState = Machine.resolveState(creep);
  currentState.executeAction(creep);
}
