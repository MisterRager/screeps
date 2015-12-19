import CreepTypes from 'creep_types';
import * as Worker from 'worker';
import * as Room from 'room';
import * as Creep from 'creep';
import Berth from 'berth';
import State from 'state';
import ChangeCondition from 'change_condition';
import StateMachine from 'state_machine';

export const BodyTiers = [
  [CARRY, MOVE],
];

export const role = 'trucker';
export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export function shouldBuildMore(data) {
  const {harvester = 0, trucker = 0, worker = 0} = data;
  return trucker < (harvester + worker);
}

export function targetResource(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.targetResource = (newVal && newVal.id) ? newVal.id : newVal;
    return newVal;
  }

  return Game.getObjectById(creep.memory.targetResource);
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
  return creep.pos.findClosestByPath(Room.groundScores(creep.room));
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

export const Machine = new StateMachine()
  .addState(
    new State("berth_move",(creep) => returnToBerth(creep, targetBerth(creep)))
      .markDefault()
      .addChangeCondition(
        new ChangeCondition(
          "collect",
          (creep) => {
            const berth = targetBerth(creep);
            return !berth || Worker.adjacent(creep, berth.position(creep.room));
          }
        )
      )
  )
  .addState(
    new State(
      "collect",
      (creep) => collectEnergy(
        creep,
        targetResource(creep) || targetResource(creep, findResource(creep))
      )
    )
      .addChangeCondition(
        new ChangeCondition(
          "berth_move",
          (creep) => {
            const berth = targetBerth(creep);
            const resource = targetResource(creep)
              || targetResource(creep, findResource(creep));
            return !resource
              && !!berth && !Worker.adjacent(creep, berth.position(creep.room));
          }
        )
      )
      .addChangeCondition(
        new ChangeCondition(
          "deposit",
          (creep) => {
            return Creep.full(creep);
          }
        )
      )
  )
  .addState(
    new State(
      "deposit",
      (creep) =>  {
        returnEnergy(
          creep,
          Worker.returnTarget(creep)
            || Worker.returnTarget(creep, Worker.findDepository(creep))
        );
      }
    )
      .addChangeCondition(
        new ChangeCondition(
          "berth_move",
          (creep) => Creep.empty(creep)
        )
      )
  );


export default function trucker(creep) {
  const currentState = Machine.resolveState(creep);
  currentState.executeAction(creep);
}
