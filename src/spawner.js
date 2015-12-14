import * as Room from 'room';
import * as Worker from 'worker';
import * as Source from 'source';
import * as Fighter from 'fighter';
import * as Healer from 'healer';
import * as Builder from 'builder';
import * as Creeps from 'creeps';
import spawnerConstruction from 'spawner_construction';

const Tunable = {
  workersPerDistance: 0.2,
  FightersPerEnemy: 1,
  ActiveCreeps: [
    Worker, Fighter, Healer, Builder
  ]
};

export function queue(spawn, newVal = undefined) {
  if (newVal !== undefined) {
    return spawn.memory.queue = newVal;
  }
  if (spawn.memory.queue === undefined || spawn.memory.queue.length === undefined) {
    spawn.memory.queue = [];
  }
  return spawn.memory.queue;
}

function prioritySortQueue(spawn) {
  queue(spawn).sort((one, two) => two[1] - one[1]);
}

export function enqueue(spawn, type, priority = 10) {
  if (!spawn.spawning) {
    console.log("Enqueueing", type, "w/Priority", priority);
    queue(spawn).push([type, priority]);
    prioritySortQueue(spawn);
  }
}

function needsHealer(damagedCount, healerCount) {
  return damagedCount > healerCount;
}

function needsWorker(spawn) {
  return !!nextSource(spawn);
}

function needsFighter(counts, hostileCount) {
  const {
    worker: workerCount = 0,
    builder: builderCount = 0,
    fighter: fighterCount = 0,
  } = counts;

  return ((workerCount + builderCount > 1) && fighterCount < 1)
    || ((workerCount + builderCount) / fighterCount > 3)
    || (hostileCount * Tunable.FightersPerEnemy > fighterCount);
}

function roleIsQueued(spawn, role) {
  return !!queue(spawn).find((item) => (item && role === item[0]));
}

function removeFirst(spawn) {
  queue(spawn).shift();
}

function incrementPriorities(spawn) {
  queue(
    spawn,
    spawn.map((entry) => {return [entry[0], entry[1] + 1];})
  );
  prioritySortQueue(spawn);
}

function firstQueuedRole(spawn) {
  const first = queue(spawn)[0];
  return (first && first.length) ? first[0] : null;
}

export function nextSource(spawn) {
  const allWorkers = Creeps.workers(spawn);
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

    if (!spawn.memory.sourceWorkerMax) spawn.memory.sourceWorkerMax = new Map();
    if (!spawn.memory.sourceWorkerMax[source.id]) {
      const pathLength = spawn.pos.findPathTo(source).length;
      if (!spawn.memory.sourceClearance
        || !spawn.memory.sourceClearance[source.id]
      ) {
        if (!spawn.memory.sourceClearances) {
          spawn.memory.sourceClearances = new Map();
        }
        spawn.memory.sourceClearances[source.id] = Source.openSides(source);
      }
      const openSides = spawn.memory.sourceClearances[source.id].length;
      const workersPer = pathLength * Tunable.workersPerDistance + openSides;
      spawn.memory.sourceWorkerMax[source.id] = workersPer;
    }
    return sourceWorkers.length < spawn.memory.sourceWorkerMax[source.id];
  });
  return next;
}

function typeByName(name) {
  return Tunable.ActiveCreeps.find((type) => name === type.role);
}

function bodyLoadout(role) {
  const activeType = typeByName(role);
  if (activeType) {
    return activeType.bodyParts();
  }
  return false;
}

// Tracks all made, not all alive
function creepCount(spawn, role, newVal = undefined) {
  if (!spawn.memory.creepCounts) {
    spawn.memory.creepCounts = new Map();
  }
  if (newVal !== undefined) {
    return spawn.memory.creepCounts[role] = newVal;
  }

  if (spawn.memory.creepCounts[role] !== undefined) {
    return spawn.memory.creepCounts[role];
  }
  return spawn.memory.creepCounts[role] = 0;
}

function processQueue(spawn, currentCreeps) {
  const queuedType = firstQueuedRole(spawn);
  const body = bodyLoadout(queuedType);
  const initialMemory = {
    spawn: spawn.id,
    role: queuedType
  };
  const nameSeq = creepCount(spawn, queuedType);
  const name = spawn.id + "_" + queuedType + "_" + nameSeq;

  switch(spawn.canCreateCreep(body, name)) {
  case OK:
    const result = spawn.createCreep(body, name, initialMemory);

    if (Number.isInteger(result)) {
      console.log("Error creating [" + queuedType + "]", body);
    } else {
      console.log("Created [" + queuedType + "]", result);
      removeFirst(spawn);
    }
    break;
  case ERR_NAME_EXISTS:
    creepCount(spawn, queuedType, nameSeq + 1);
    processQueue(spawn, currentCreeps);
    break;
  }
}

export default function spawner(spawn) {
  const currentCreeps = Creeps.bySpawn(spawn);
  const badGuys = Room.enemies(spawn.room);
  const hostiles = Room.nonSourceKeepers(badGuys);
  const counts = new Map();
  const hostileCount = hostiles ? hostiles.length : 0;
  let damagedCount = 0;

  currentCreeps.forEach((creep) => {
    counts[creep.memory.role] = counts[creep.memory.role] ?
      counts[creep.memory.role] + 1 : 1;

    switch(creep.memory.role) {
    case Builder.role:
      if (Builder.isBuilding(creep)) {
        break;
      }
    case Fighter.role:
    case Worker.role:
      const sauce = Worker.source(creep);
      // Assign unassigned workers
      if (!sauce || !sauce.id) {
        Worker.source(creep, nextSource(spawn));
      }
      break;
    }

    if (creep.hitsMax > creep.hits) {
      ++damagedCount;
    }

    const activeType = typeByName(creep.memory.role);
    if (activeType) {
      activeType.default(creep);
    }
  });

  const {
    worker: workerCount = 0,
    builder: builderCount = 0,
    fighter: fighterCount = 0,
    healer: healerCount = 0
  } = counts;

  if (needsFighter(counts, hostileCount) && !roleIsQueued(spawn, Fighter.role)) {
    enqueue(spawn, Fighter.role, 100);
  }

  if (needsHealer(damagedCount, healerCount || 0) && !roleIsQueued(spawn, Healer.role)) {
    enqueue(spawn, Healer.role, 50);
  }

  let levelRcl = false;

  // Ready to start building
  if (hostiles.length < 1 && workerCount  > 3) {
    if (builderCount < 1 && !roleIsQueued(spawn, Builder.role)) {
      enqueue(spawn, Builder.role, 20);
    }
    if (spawnerConstruction(spawn) === ERR_RCL_NOT_ENOUGH) {
       levelRcl = true;
    }
  }

  spawn.memory.levelRcl = levelRcl;

  if (needsWorker(spawn) && !roleIsQueued(spawn, Worker.role)) {
    enqueue(spawn, Worker.role, 10);
  }

  if (workerCount > 3
    && ((workerCount / 5 ) > builderCount)
    && !roleIsQueued(spawn, Builder.role)
  ) {
    enqueue(spawn, Builder.role, 20);
  }

  // Process creep build queue
  if (queue(spawn).length > 0) {
    processQueue(spawn, currentCreeps);
  }
}
