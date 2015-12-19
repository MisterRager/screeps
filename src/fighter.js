import CreepTypes from 'creep_types';
import * as Room from 'room';
import * as Worker  from 'worker';

export const role = "fighter";

export const BodyTiers = [
  [TOUGH, MOVE, MOVE, ATTACK],
  [TOUGH, TOUGH, MOVE, MOVE, ATTACK],
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export function shouldBuildMore(data) {
  const {
    worker = 0,
    builder = 0,
    fighter = 0,
    trucker = 0,
    harvester = 0,
    hostiles = 0,
    fightersPerEnemy = 1
  } = data;

  return (((worker + builder + trucker + harvester) / (fighter + 1)) > 3)
    || ((hostiles * fightersPerEnemy) > fighter);
}

export function target(creep) {
  if (creep.memory.target) {
    const savedTarget = Game.getObjectById(creep.memory.target);
    if (savedTarget) return savedTarget;
  }

  const eligibles = Room.nonSourceKeepers(creep.room);
  if (eligibles && eligibles.length) {
    const chosen = eligibles.map((enemy) => {
      return {
        path: creep.pos.findPathTo(enemy.pos),
        creep: enemy
      };
    }).sort((first, second) => {
      return ((first && first.length) ? first.length : 0)
        - ((second && second.length) ? second.length : 0);
    })[0];

    if (chosen) {
      creep.memory.target = chosen.creep.id;
      return chosen.creep;
    }
  }

  return null;
}

function clearTarget(creep) {
  creep.memory.target = undefined;
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

    if (Worker.adjacent(creep, target.pos)) {
      patrolSourceInbound(creep, !inbound);
      creep.moveTo(from);
    } else {
      creep.moveTo(target);
    }
  }
}

export default function fighter(creep) {
  if (creep) {
    const shootThis = target(creep);
    if (shootThis && shootThis.id) {
      const shootResult = creep.attack(shootThis);
      switch(shootResult) {
      case ERR_INVALID_TARGET:
        clearTarget(creep);
        break;
      case ERR_NOT_IN_RANGE:
        creep.moveTo(shootThis);
        break;
      }
    } else {
      //patrolSource(creep);
    }
  }
}
