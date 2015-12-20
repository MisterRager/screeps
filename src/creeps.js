"use strict";

import {creeps} from 'room';

export function byRoom(room) {
  return creeps(room);
}

export function bySpawn(spawn) {
  return byRoom(spawn.room).filter((creep) => creep.memory.spawn === spawn.id);
}

export function roleFilter(creeps, role) {
  return creeps.filter((creep) => creep.memory.role === role);
}

export function bySpawnAndType(spawn, type) {
  return roleFilter(bySpawn(spawn), type);
}

