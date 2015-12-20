import CreepTypes from 'creep_types';
import * as Worker from 'worker';
import * as Room from 'room';
import * as Creep from 'creep';
import * as Harvester from 'harvester';
import Berth from 'berth';
import State from 'state';
import ChangeCondition from 'change_condition';
import StateMachine from 'state_machine';

export const BodyTiers = [
  [CARRY, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]
];

export const role = 'trucker';
export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export function shouldBuildMore(data) {
  const {trucker = 0, underservedHarvesters = 0} = data;
  return underservedHarvesters > 0;
}

export function targetResource(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.targetResource = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }

  return Game.getObjectById(creep.memory.targetResource);
}

export function targetHarvester(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.targetHarvester = (newVal && newVal.id) ?
      newVal.id : newVal;
    return newVal;
  }

  if (creep.memory.targetHarvester) {
    const target = Game.getObjectById(creep.memory.targetHarvester);
    if (target && Creep.role(target) === Harvester.role) {
      return target;
    }
    return targetHarvester(creep, null);
  }

  return null;
}


export function targetBerth(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.targetBerth = (newVal && newVal.serialize) ?
      newVal.serialize() : newVal;
    return newVal;
  }

  if (creep.memory.targetBerth) {
    return Berth.unserialize(creep.memory.targetBerth);
  }

  return null;
}

function findResource(creep) {
  return creep.pos.findClosestByRange(
    creep.pos.findInRange(FIND_DROPPED_RESOURCES, 4)
  );
}

function returnToBerth(creep, berth) {
  const berthPlace = berth.position(creep.room);
  creep.moveTo(berthPlace);
}

function collectEnergy(creep, target) {
  if (Worker.adjacent(creep, target)) {
    creep.pickup(target);
  } else {
    creep.moveTo(target);
  }
}

function returnEnergy(creep, target) {
  if (Worker.adjacent(creep, target)) {
    Worker.returnEnergyTo(creep, target);
  } else {
    creep.moveTo(target);
  }
}

function hasTargetEnergy(creep) {
  return !!(
    targetResource(creep) || targetResource(creep, findResource(creep))
  );
}

function moveToEnergy(creep) {
  creep.moveTo(targetResource(creep));
}

function hasNoTargetEnergy(creep) {
  return !hasTargetEnergy(creep);
}

function nearHarvester(creep) {
  const harvester = targetHarvester(creep);
  return !!harvester && Worker.adjacent(creep, harvester);
}

function notNearHarvester(creep) {
  const harvester = targetHarvester(creep);
  return !!harvester && !Worker.adjacent(creep, harvester);
}

function nearResource(creep) {
  return !!targetResource(creep) && Worker.adjacent(creep, targetResource(creep).pos);
}

export const Machine = new StateMachine()
  .addState(
    new State("harvest_position",(creep) => creep.moveTo(targetHarvester(creep)))
      .markDefault()
      .addChangeCondition(new ChangeCondition(
        "collect", (creep) => notNearHarvester(creep) && !nearResource(creep)
      ))
  )
  .addState(
    new State("chaseEnergy", moveToEnergy)
      .addChangeCondition(new ChangeCondition("harvest_position", hasNoTargetEnergy))
      .addChangeCondition(new ChangeCondition("collect", nearResource))
  )
  .addState(
    new State("collect",(creep) => collectEnergy(creep, targetResource(creep)))
      .addChangeCondition(new ChangeCondition(
        "harvest_position",
        (creep) => hasNoTargetEnergy(creep) && notNearHarvester(creep)
      ))
      .addChangeCondition(new ChangeCondition("deposit", Creep.full))
  )
  .addState(
    new State("deposit", (creep) =>  {
      returnEnergy(
        creep,
        Worker.returnTarget(creep)
          || Worker.returnTarget(creep, Worker.findDepository(creep))
      );
    })
    .addChangeCondition(new ChangeCondition("harvest_position",Creep.empty))
  );


export default function trucker(creep) {
  const currentState = Machine.resolveState(creep);
  currentState.executeAction(creep);
}
