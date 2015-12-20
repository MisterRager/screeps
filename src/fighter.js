import CreepTypes from 'creep_types';
import * as Room from 'room';
import * as Creeps from 'creeps';
import * as Worker  from 'worker';
import * as Creep from 'creep';
import StateMachine from 'state_machine';
import ChangeCondition from 'change_condition';
import State from 'state';

export const role = "fighter";

export const BodyTiers = [
  [TOUGH, MOVE, MOVE, ATTACK],
  [TOUGH, TOUGH, MOVE, MOVE, ATTACK],
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export const Tunable = {
  formationDistance: 2
};

export function shouldBuildMore(data) {
  const {
    worker = 0,
    builder = 0,
    fighter = 0,
    trucker = 0,
    harvester = 0,
    hostiles = 0,
    healer = 0,
    fightersPerEnemy = 1
  } = data;

  const softCreeps = worker + builder + trucker + harvester;

  return (softCreeps > 1 && (((softCreeps + 1)/ fighter) > 3))
    || ((hostiles * fightersPerEnemy) > fighter)
    || (healer > fighter);
}

export function target(creep, newVal = undefined) {
  if (newVal !== undefined && newVal.id) {
    creep.memory.target = newVal.id;
    return newVal;
  }
  const nearbyTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1);
  if (nearbyTargets && nearbyTargets.length) {
    const targetIndex = Math.floor(nearbyTargets.length * Math.random());
    return target(creep, nearbyTargets[targetIndex]);
  }

  if (creep.memory.target) {
    const savedTarget = Game.getObjectById(creep.memory.target);
    if (savedTarget) {
      return savedTarget;
    }
  }

  const eligibles = Room.nonSourceKeepers(creep.room);
  if (eligibles && eligibles.length) {
    return target(
      creep,
      creep.pos.findClosestByPath(eligibles)
    );
  }

  return null;
}

function patrolSourceInbound(creep, newVal = undefined) {
  if (newVal !== undefined) {
    return !!(creep.memory.patrolSourceInbound = newVal);
  }
  return !!creep.memory.patrolSourceInbound;
}

function patrolSource(creep) {
  const sauce = Worker.source(creep);
  const spawn = Worker.spawn(creep);

  if (sauce && spawn) {
    const inbound = patrolSourceInbound(creep);
    let target = inbound ? spawn : sauce;
    let from = inbound ? sauce : spawn;

    if (target && Worker.adjacent(creep, target.pos)) {
      patrolSourceInbound(creep, !inbound);
      creep.moveTo(from);
    } else {
      creep.moveTo(target);
    }
  }
}

export function patrolPos(creep, newPos = undefined) {
  if (newPos !== undefined) {
    const {x,y} = newPos;
    creep.memory.patrolX = x;
    creep.memory.patrolY = y;
    return newPos;
  }
  const {patrolX, patrolY} = creep.memory;
  if (patrolX !== undefined && patrolY !== undefined) {
    return creep.room.getPositionAt(patrolX, patrolY);
  }
  return null;
}

function patrolArrived(creep) {
  return Creep.isAt(patrolPos(creep));
}

function nearSource(creep) {
  return Worker.adjacent(creep, Worker.source(creep));
}

function nearTarget(creep) {
  return target(creep) && Worker.adjacent(creep, target(creep));
}

function notNearTarget(creep) {
  return target(creep) && !Worker.adjacent(creep, target(creep));
}

function noPatrolPosition(creep) {
  return !patrolPos(creep);
}

function peacePatrol(creep) {
  return !target(creep) && !!patrolPos(creep);
}

function peaceIdle(creep) {
  return !target(creep) && !patrolPos(creep);
}

export function squadLeader(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.squadLeader = (newVal && newVal.id) ?
      newVal.id : newVal;
    return newVal;
  }

  if (creep.memory.squadLeader) {
    return Game.getObjectById(creep.memory.squadLeader);
  }

  return null;
}

export function joinFormation(creep) {
  let leader = squadLeader(creep);

  if (!leader) {
    const fighters = Creeps.roleFilter(
      Room.creeps(creep.room),
      role
    );

    const furthestFighter = fighters.map(
      (fighter) => {
        return {
          creep: fighter,
          distance: creep.pos.getRangeTo(fighter)
        };
      }
    ).sort((f1, f2) => (f2.distance - f1.distance))[0];

    if (furthestFighter) {
      leader = squadLeader(creep, furthestFighter.creep);
    }
  }

  if (leader && !creep.pos.inRangeTo(leader, Tunable.formationDistance)) {
    creep.moveTo(leader);
  }
}

export const Machine = new StateMachine()
  .addState(
    new State("patrol_go", (creep) => creep.moveTo(patrolPos(creep)))
      .markDefault()
      .addChangeCondition(new ChangeCondition("idle", noPatrolPosition))
      .addChangeCondition(new ChangeCondition("patrol_return", patrolArrived))
      .addChangeCondition(new ChangeCondition("pursue", notNearTarget))
      .addChangeCondition(new ChangeCondition("attack", nearTarget))
  )
  .addState(
    new State("patrol_return", (creep) => creep.moveTo(Worker.source(creep)))
      .addChangeCondition(new ChangeCondition("patrol_go", nearSource))
      .addChangeCondition(new ChangeCondition("pursue", notNearTarget))
      .addChangeCondition(new ChangeCondition("attack", nearTarget))
  )
  .addState(
    new State("idle", joinFormation)
      .addChangeCondition(new ChangeCondition("patrol_go", patrolPos))
      .addChangeCondition(new ChangeCondition("pursue", notNearTarget))
      .addChangeCondition(new ChangeCondition("attack", nearTarget))
  )
  .addState(
    new State("attack", (creep) => creep.attack(target(creep)))
      .addChangeCondition(new ChangeCondition("pursue", notNearTarget))
      .addChangeCondition(new ChangeCondition("patrol_go", peacePatrol))
      .addChangeCondition(new ChangeCondition("idle", peaceIdle))
  )
  .addState(
    new State("pursue", (creep) => creep.moveTo(target(creep)))
      .addChangeCondition(new ChangeCondition("attack", nearTarget))
      .addChangeCondition(new ChangeCondition("patrol_go", peacePatrol))
      .addChangeCondition(new ChangeCondition("idle", peaceIdle))
  )
  ;

export default function fighter(creep) {
  const currentState = Machine.resolveState(creep);
  currentState.executeAction(creep);
}
