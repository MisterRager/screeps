import CreepTypes from 'creep_types';
import * as Worker from 'worker';
import * as Creep from 'creep';
import Berth from 'berth';

export const BodyTiers = [
  [WORK, WORK, MOVE],
  [WORK, WORK, WORK, MOVE]
];

export const role = 'harvester';
export const bodyParts = CreepTypes.tierFunction(BodyTiers);

export function shouldBuildMore(data) {
  const {harvester = 0, worker = 0, berths = 0, trucker = 0} = data;
  return (worker > 0 || trucker > 0) && harvester < berths;
}

export function berth(creep, newVal = undefined) {
  if (newVal !== undefined) {
    creep.memory.berthInfo = (newVal && newVal.serialize) ? newVal.serialize() : newVal;
    return newVal;
  }

  if (creep.memory.berthInfo) {
    return Berth.unserialize(creep.memory.berthInfo);
  }

  return null;
}

export default function harvester(creep) {
  const harvesterBerth = berth(creep);
  if (!Creep.empty(creep)) {
    const {power, energy} = creep.carry;
    energy > 0 && creep.drop(RESOURCE_ENERGY, energy);
    power > 0 && creep.drop(RESOURCE_POWER, power);
  }
  if (harvesterBerth) {
    const pos = harvesterBerth.position(creep.room);
    const creepPos = creep.pos;
    if (creepPos.x !== pos.x || creepPos.y !== pos.y) {
      if (creep.room.lookForAt("creep", pos).length) {
        berth(creep, null);
      }
      const moveResponse = creep.moveTo(pos);
    } else {
      const source = Worker.source(creep);
      creep.harvest(source);
    }
  }
}
