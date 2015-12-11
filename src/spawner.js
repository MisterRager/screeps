import * as Room from 'room';
import * as Worker from 'worker';
import * as Source from 'source';
import * as Fighter from 'fighter';
import spawnerConstruction from 'spawner_construction';

import CreepTypes from 'creep_types';

const Tunable = {
  WorkersPerDistance: 0.5
};

export function creeps(spawn) {
  return Room.creeps(spawn.room).filter((creep) => creep.memory.spawn === spawn.id);
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

export function fighters(spawn) {
  if (Array.isArray(spawn)) {
    return roleFilter(spawn, Fighter.role);
  }
  return creepsOfType(spawn, Fighter.role);
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
  console.log("Enqueueing spawn of type " + type + " at front of list");
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

function nextSource(spawn) {
  const allWorkers = workers(spawn);
  let next = Room.sources(spawn.room).find((source) => {
    const sourceKeepers = source.pos.findInRange(
      FIND_HOSTILE_CREEPS, 4
    ).filter(
      (creep) => creep.owner.username === 'Source Keeper'
    );

    if (sourceKeepers && sourceKeepers.length) {
      return false;
    }

    // Get all workers assigned a given source
    const sourceWorkers = allWorkers.filter((creep) => {
      const sauce = Worker.source(creep);
      return sauce && sauce.id && source && source.id && sauce.id === source.id;
    });

    if (!spawn.memory.sourceWorkerMax) spawn.memory.sourceWorkerMax = {};
    if (!spawn.memory.sourceWorkerMax[source.id]) {
      const pathLength = spawn.pos.findPathTo(source).length;
      if (!spawn.memory.sourceClearance
        || !spawn.memory.sourceClearance[source.id]
      ) {
        if (!spawn.memory.sourceClearances) {
          spawn.memory.sourceClearances = {};
        }
        spawn.memory.sourceClearances[source.id] = Source.openSides(source);
      }
      const openSides = spawn.memory.sourceClearances[source.id].length;
      const workersPer = pathLength * Tunable.WorkersPerDistance * openSides / 8;
      spawn.memory.sourceWorkerMax[source.id] = workersPer;
    }
    return sourceWorkers.length < spawn.memory.sourceWorkerMax[source.id];
  });
  return next;
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
  const workerCreeps = workers(currentCreeps);
  const badGuys = Room.enemies(spawn.room);
  const hostiles = Room.nonSourceKeepers(badGuys);
  const fighterCreeps = fighters(currentCreeps);

  if (needsWorker(spawn) && !roleIsQueued(spawn, Worker.role)) {
    enqueue(spawn, Worker.role);
  }

  // Assign unassigned workers
  workerCreeps.forEach(
    (creep) => {
      const sauce = Worker.source(creep);
      if (!sauce || !sauce.id) {
        Worker.source(creep, nextSource(spawn));
      }

      Worker.default(creep);
    }
  );

  fighterCreeps.forEach(
    (creep) => {
      Fighter.default(creep);
    }
  );

  if (badGuys && badGuys.length) {
    if (hostiles && hostiles.length) {
      if (!roleIsQueued(spawn, Fighter.role)) {
        enqueueFirst(spawn, Fighter.role);
      }
    }
  }

  // Add construction jobs
  if (hostiles.length < 1
    && workerCreeps.length > 3
    && spawnerConstruction(spawn) === ERR_RCL_NOT_ENOUGH
  ) {
    spawn.memory.levelRcl = true;
  } else {
    spawn.memory.levelRcl = false;
  }

  // Process creep build queue
  if (queue(spawn).length > 0) {
    processQueue(spawn, currentCreeps);
  }
}