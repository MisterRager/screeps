import * as Room from 'room';
import * as Worker from 'worker';
import * as Source from 'source';
import * as Fighter from 'fighter';
import * as Healer from 'healer';
import * as Builder from 'builder';
import * as Harvester from 'harvester';
import * as Trucker from 'trucker';
import * as Creeps from 'creeps';
import * as Creep from 'creep';
import Berth from 'berth';
import spawnerConstruction from 'spawner_construction';

const Tunable = {
  workersPerDistance: 0.2,
  truckersPerDistance: 0.1,
  FightersPerEnemy: 1,
  ActiveCreeps: [
    Worker,
    Fighter,
    Healer,
    Builder,
    Trucker,
    Harvester
  ],
  Priority: {
    fighter: 100,
    healer: 50,
    builder: 20,
    trucker: 30,
    harvester: 15,
    worker: 10
  }
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

function roleIsQueued(spawn, role) {
  return !!queue(spawn).find((item) => (item && role === item[0]));
}

function removeFirst(spawn) {
  queue(spawn).shift();
}

function incrementPriorities(spawn) {
  queue(
    spawn,
    queue(spawn).map((entry) => {return [entry[0], entry[1] + 1];})
  );
  prioritySortQueue(spawn);
}

function firstQueuedRole(spawn) {
  const first = queue(spawn)[0];
  return (first && first.length) ? first[0] : null;
}

export function berths(spawn, source = undefined) {
  let berths = null;
  if (spawn.memory.berths && spawn.memory.berths.length) {
    berths = spawn.memory.berths.map(Berth.unserialize);
  } else {
    berths = Room.sources(spawn.room).reduce(
      (berthList, source) => {
        return [
          ...berthList,
          ...Berth.sourceBerths(source)
        ];
      },
      []
    );
    spawn.memory.berths = berths.map((bert) => bert.serialize());
  }

  if (source) {
    return berths.filter((bert) => bert.source_id === source.id);
  }
  return berths;
}

export function nextSource(spawn) {
  const allCreeps = Room.creeps(spawn.room);
  const workerRoles = [Worker.role, Harvester.role];
  const allWorkers = allCreeps.filter(
    (creep) => !!workerRoles.find((role) => role === Creep.role(creep))
  );

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
      const pathLength = spawn.pos.findPathTo(
        source,
        {ignoreCreeps: true}
      ).length;
      const openSides = berths(spawn, source).length;
      const workersPer = pathLength * Tunable.workersPerDistance + openSides;
      spawn.memory.sourceWorkerMax[source.id] = workersPer;
    }
    return sourceWorkers.length < spawn.memory.sourceWorkerMax[source.id];
  });
  return next;
}

export function underservedHarvesters(spawn) {
  const creepList = Creeps.bySpawn(spawn);

  const serviceMap = creepList.reduce(
    (anMap, creep) => {
      if (Creep.role(creep) === Trucker.role) {
        const harvester = Trucker.targetHarvester(creep);
        if (harvester) {
          if (!anMap.has(harvester.id) || !anMap[harvester.id]) {
            anMap.set(harvester.id, {
              truckers: [creep],
              harvester: harvester
            });
          } else {
            anMap.get(harvester.id).truckers.push(creep);
          }
        }
      } else if (Creep.role(creep) === Harvester.role) {
        if (!anMap.has(creep.id) || !anMap[creep.id]) {
          anMap.set(creep.id, {
            truckers: [],
            harvester: creep
          });
        }
      }
      return anMap;
    },
    new Map()
  );
  const underserved = [];

  serviceMap.forEach(
    (harvesterData, harvesterId) => {
      const {harvester, truckers} = harvesterData;
      const distance = spawn.pos.findPathTo(
        harvester.pos,
        {ignoreCreeps: true}
      ).length;
      const needsService = distance >
        Math.round(truckers * Tunable.truckersPerDistance + 1);

      if (needsService) {
        underserved.push({
          harvester: harvester,
          distance: distance
        });
      }
    }
  );

  return underserved.sort(
    (dataA, dataB) => dataA.distance - dataB.distance
  ).map((data) => data.harvester);
}

export function nextUnderservedHarvester(spawn) {
  return underservedHarvesters(spawn)[0];
}

export function emptyBerths(spawn, creeps = undefined) {
  const creepList = (creeps && creeps.length) ?
    creeps : Creeps.bySpawnAndType(spawn, Harvester.role);

  const harvesterMap = creepList.reduce(
    (buildMap,creep) => {
      if (Creep.role(creep) === Harvester.role) {
        const berth = Harvester.berth(creep);
        if (berth) {
          const berthKey = berth.serialize();
          if (!buildMap[berthKey] || !buildMap[berthKey].length) {
            buildMap[berthKey] = [creep];
          } else {
            buildMap[berthKey].push(creep);
          }
        }
        return buildMap;
      }
    },
    new Map()
  );
  return berths(spawn).filter((berth) => !harvesterMap[berth.serialize()]);
}

export function nextEmptyBerth(spawn, creeps = undefined) {
  const distances = new Map();
  return emptyBerths(spawn, creeps).sort(
    (berthA, berthB) => {
      const [valA, valB] = [berthA, berthB].map(
        (berthItem) => {
          const berthKey = berthItem.serialize();

          if (!distances[berthKey]) {
            return distances[berthKey] = spawn.pos.findPathTo(
              berthItem.position(spawn.room)
            ).length;
          }
          return distances[berthKey];
        });
      return valA - valB;
    }
  )[0];
}

function typeByName(name) {
  return Tunable.ActiveCreeps.find((type) => name === type.role);
}

function bodyLoadout(role) {
  const activeType = typeByName(role);
  if (!!activeType) {
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
    console.log("Exists:", name);
    creepCount(spawn, queuedType, nameSeq + 1);
    processQueue(spawn, currentCreeps);
    break;
  }

  //incrementPriorities(spawn);
}

function levelRcl(spawn, counts = {}) {
  const {hostiles = 0, worker = 0, harvester = 0, trucker = 0} = counts;
  // Ready to start building
  return (hostiles < 1 && trucker  > 5)
    && (spawnerConstruction(spawn) === ERR_RCL_NOT_ENOUGH);
}

export default function spawner(spawn) {
  const currentCreeps = Creeps.bySpawn(spawn);
  const badGuys = Room.enemies(spawn.room);
  const hostiles = Room.nonSourceKeepers(badGuys);
  const hostileCount = hostiles ? hostiles.length : 0;
  let damagedCount = 0;

  // Set up missing creep state
  const counts = currentCreeps.reduce(
    (counts, creep) => {
      const creepRole = Creep.role(creep);
      const count = counts[creepRole];
      counts[creepRole] =  count ? count + 1 : 1;

      switch(creepRole) {
      case Trucker.role:
        if (!Trucker.targetHarvester(creep)) {
          const newHarvester = nextUnderservedHarvester(spawn);
          Trucker.targetHarvester(creep, newHarvester);
        }
        break;
      case Harvester.role:
        if (!Harvester.berth(creep)) {
          const newBerth = nextEmptyBerth(spawn);
          Harvester.berth(creep, newBerth);
        }
        break;
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
      return counts;
    },
    new Map()
  );

  const {
    harvester: harvesterCount = 0,
    worker: workerCount = 0,
    trucker: truckerCount = 0
  } = counts;

  currentCreeps.forEach(
    (creep) => {
      const activeType = typeByName(Creep.role(creep));
      // Find pluripotent creeps, assess role
      let newBehavior = null;
      if (Creep.hasParts(creep, [WORK, MOVE, CARRY])) {
        switch(activeType.role) {
        case Worker.role:
          if (truckerCount > 0) {
            newBehavior = Harvester;
          }
          break;
        case Builder.role:
          if (hostileCount > 0) {
            newBehavior = harvesterCount > 2 ? Trucker : Harvester;
          } else if (harvesterCount === 0) {
            newBehavior = Harvester;
          }
          break;
        case Harvester.role:
        case Trucker.role:
          if (hostileCount === 0 && truckerCount > 3) {
            newBehavior = Builder
          }
          break;
        }
      }

      // Set new role, execute role
      if (newBehavior && newBehavior.role !== Creep.role(creep)) {
        Creep.role(creep, newBehavior.role);
        newBehavior.default(creep);
        counts[activeType.role]--;
        counts[newBehavior.role]++;
      } else {
        activeType.default(creep);
      }
    }
  );

  const params = {
    hostile: hostileCount,
    damaged: damagedCount,
    fightersPerEnemy: Tunable.FightersPerEnemy,
    berths: berths(spawn).length,
    underservedHarvesters: underservedHarvesters(spawn).length,
    ...counts
  };

  // Queue up any needed build jobs
  Tunable.ActiveCreeps.forEach(
    (type) => {
      const {role} = type;
      if (type.shouldBuildMore(params) && !roleIsQueued(spawn, role)) {
        enqueue(spawn, role, Tunable.Priority[role]);
      }
    }
  );

  // Process creep build queue
  if (queue(spawn).length > 0) {
    processQueue(spawn, currentCreeps);
  }
}
