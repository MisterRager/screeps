import * as Worker from 'worker';
import * as Fighter from 'fighter';
import {creeps} from 'room';

export function bySpawn(spawn) {
  return creeps(spawn.room).filter((creep) => creep.memory.spawn === spawn.id);
}

export function roleFilter(creeps, role) {
  return creeps.filter((creep) => creep.memory.role === role);
}

export function bySpawnAndType(spawn, type) {
  return roleFilter(bySpawn(spawn), type);
}

export function workers(spawn) {
  if (Array.isArray(spawn)) {
    return roleFilter(spawn, Worker.role);
  }
  return bySpawnAndType(spawn, Worker.role);
}

export function fighters(spawn) {
  if (Array.isArray(spawn)) {
    return roleFilter(spawn, Fighter.role);
  }
  return bySpawnAndType(spawn, Fighter.role);
}
