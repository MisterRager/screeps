"use strict";

import * as Fighter from 'fighter';
import * as Worker from 'worker';
import * as Creep from 'creep';
import * as Creeps from 'creeps';
import CreepTypes from 'creep_types';
import StateMachine from 'state_machine';
import ChangeCondition from 'change_condition';
import State from 'state';


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
  const myCreeps = Creeps.byRoom(creep.room);
  const injuredArr = myCreeps.filter((creep) => isHurt(creep));

  if (injuredArr && injuredArr.length) {
    return creep.pos.findClosestByPath(injuredArr);
  }

  return null;
}

export function isHurt(creep) {
  return creep.hits < creep.hitsMax;
}

function inRange(creep, target) {
  return creep.pos.inRangeTo(target.pos, 3);
}

function notInRange(creep, target) {
  return !inRange(creep, target);
}

function noPatients(creep) {
  return !patient(creep) && !patient(creep, findPatient(creep));
}

function hasDistantPatient(creep) {
  return !noPatients(creep) && notInRange(creep, patient(creep));
}

function hasNearPatient(creep) {
  return !noPatients(creep) && inRange(creep, patient(creep));
}

function goHealPatient(creep) {
  if (!noPatients(creep)) {
    const target = patient(creep);
    creep.heal(target);
    if (!Worker.adjacent(creep, target)) {
      creep.moveTo(target);
    }
  }
}

function chasePatient(creep) {
  let ownPatient = patient(creep);
  if (!ownPatient) {
    ownPatient = patient(creep, findPatient(creep));
  }

  if (ownPatient) {
    creep.moveTo(ownPatient);
  }
}

function chaseFighter(creep) {
  const spawn = Worker.spawn(creep);
  const myCreeps = Creeps.byRoom(creep.room);
  const fighters = Creeps.roleFilter(myCreeps, Fighter.role);
  const nearestFighter = creep.pos.findClosestByRange(fighters);

  if (nearestFighter && !Worker.adjacent(creep, nearestFighter)) {
    creep.moveTo(nearestFighter);
  }
}

export const Machine = new StateMachine()
  .addState(
    new State("heal", goHealPatient)
      .markDefault()
      .addChangeCondition(new ChangeCondition("battle_ready", noPatients))
      .addChangeCondition(new ChangeCondition("pursue", hasDistantPatient))
  )
  .addState(
    new State("pursue", chasePatient)
      .addChangeCondition(new ChangeCondition("battle_ready", noPatients))
      .addChangeCondition(new ChangeCondition("heal", hasNearPatient))
  )
  .addState(
    new State("battle_ready", Fighter.joinFormation)
      .addChangeCondition(new ChangeCondition("heal", hasNearPatient))
      .addChangeCondition(new ChangeCondition("pursue", hasDistantPatient))
  )
  ;

export default function healer(creep) {
  const currentState = Machine.resolveState(creep);
  currentState.executeAction(creep);
}
