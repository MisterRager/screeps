import CreepTypes from 'creep_types';
import * as Fighter from 'fighter';
import * as Worker from 'worker';

export const BodyTiers = [
  [MOVE, HEAL],
  [MOVE, MOVE, HEAL]
];

export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export const role = "healer";

export function shouldBuildMore(data) {
  const {healer = 0, fighter = 0, damaged = 0} = data;
  return (damaged > healer) || (fighter > 1 && fighter > (1.5 * healer));;
}

export function patient(creep, newPatient = undefined) {
  if (newPatient) {
    creep.memory.patient = newPatient.id;
    return newPatient;
  }

  return creep.memory.patient ? Game.getObjectById(creep.memory.patient) : null;
}

function findPatient(creep) {
  const myCreeps = creep.room.find(FIND_MY_CREEPS);
  const injuredArr = myCreeps.filter((creep) => isHurt(creep));

  if (injuredArr && injuredArr.length) {
    return creep.pos.findClosestByPath(injuredArr);
  }

  const fighterArr = myCreeps.filter((creep) => creep.role === Fighter.role);

  if (fighterArr && fighterArr.length) {
    return creep.pos.findClosestByPath(fighterArr);
  }

  return null;
}

export function isHurt(creep) {
  return creep.hits < creep.hitsMax;
}

export default function healer(creep) {
  let currentPatient = patient(creep);

  if (currentPatient && isHurt(currentPatient)) {
    if (!Worker.adjacent(creep, currentPatient)) {
      creep.moveTo(currentPatient);
    }
    creep.heal(currentPatient);
  } else {
    patient(creep, findPatient(creep));
  }
}
