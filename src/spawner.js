import {creeps as roomCreeps, sources as roomSources} from 'room';
import * as Worker from 'worker';
import * as Source from 'source';

import CreepTypes from 'creep_types';

const Tunable = {
  WorkersPerDistance: 0.5
};

export function creeps(spawn) {
  return roomCreeps(spawn.room).filter((creep) => creep.memory.spawn === spawn.id);
}

function roleFilter(creeps, role) {
  return creeps.filter((creep) => creep.memory.role === role);
}

export function creepsOfType(spawn, type) {
  return roleFilter(creeps(spawn), type);
}

export function workers(spawn) {
  if (Array.isArray(spawn)) {
    return roleFilter(spawn, Worker.role);
  }
  return creepsOfType(spawn, Worker.role);
}

function queue(spawn) {
  if (spawn.memory.queue === undefined || spawn.memory.queue.length === undefined) {
    spawn.memory.queue = [];
  }
  return spawn.memory.queue;
}

export function enqueue(spawn, type) {
  console.log("Enqueueing spawn of type " + type);
  queue(spawn).push(type);
}

export function enqueueFirst(spawn, type) {
  queue(spawn).unshift(type);
}

function removeFirst(spawn) {
  queue(spawn).shift();
}

function needsWorker(spawn) {
  return !!nextSource(spawn);
}

function roleIsQueued(spawn, role) {
  return !!queue(spawn).find((item) => role === item);
}

export function nextSource(spawn) {
  const allWorkers = workers(spawn);
  return roomSources(spawn.room).find((source) => {
    // Get all workers assigned a given source
    const sourceWorkers = allWorkers.filter((creep) => {
      const sauce = Worker.source(creep);
      return sauce && sauce.id && source && source.id && sauce.id === source.id;
    });

    const pathLength = spawn.pos.findPathTo(source).length;
    const openSides = Source.openSideCount(source);
    const workersPer = pathLength * Tunable.WorkersPerDistance * openSides / 8;
    return sourceWorkers.length < workersPer;
  });
}

function processQueue(spawn, currentCreeps) {
  const queuedType = queue(spawn)[0];
  const existingCreeps = roleFilter(currentCreeps, queuedType);
  const body = CreepTypes[queuedType]();
  const name = spawn.id + "_" + queuedType + "_" + existingCreeps.length;
  const initialMemory = {
    spawn: spawn.id,
    role: queuedType
  };

  if (spawn.canCreateCreep(body, name) === OK) {
    const result = spawn.createCreep(body, name, initialMemory);

    if (Number.isInteger(result)) {
      console.log("Error creating [" + queuedType + "]", body);
    } else {
      console.log("Created [" + queuedType + "]", result);
      removeFirst(spawn);
    }
  }
}

export default function spawner(spawn) {
  const currentCreeps = creeps(spawn);
  if (needsWorker(spawn) && !roleIsQueued(spawn, Worker.role)) {
    enqueue(spawn, Worker.role);
  }

  // Assign unassigned workers
  workers(currentCreeps)
    .forEach(
      (creep) => {
        const sauce = Worker.source(creep);
        if (!sauce || !sauce.id) {
          Worker.source(creep, nextSource(spawn));
        }

        Worker.default(creep);
      }
    );

  // Process creep build queue
  if (queue(spawn).length > 0) {
    processQueue(spawn, currentCreeps);
  }
}
