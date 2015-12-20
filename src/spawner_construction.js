"use strict";

import * as Room from 'room';
import * as Creeps from 'creeps';
import * as Trucker from 'trucker';
import * as Worker from 'worker';

function isSpaceTaken(room, x, y) {
  const spaceInfo = room.lookAt(x, y);
  return spaceInfo && spaceInfo.length
    && spaceInfo.every((info) => {
      return (info.type === "structure")
        || (info.type === "constructionSite")
        || (info.type === "terrain" && info.terrain === "wall")
    });
}

export function setupSwampRoads(spawn) {
  const {room} = spawn;
  const truckerSources = Creeps.roleFilter(
    Creeps.bySpawn(spawn), Trucker.role
  ).reduce(
    (sources, creep) => {
      const harvester = Trucker.targetHarvester(creep);

      if (harvester) {
        const source = Worker.source(harvester);
        if (source
          && sources.every((compSource) => compSource.id !== source.id)
        ) {
          sources.push(source);
        }
      }

      return sources;
    },
    []
  );
  return truckerSources.reduce(
    (builtCount,source) => {
      const path = spawn.pos.findPathTo(
        source.pos,
        {ignoreCreeps: true}
      );
      path.reduce(
        (made, step) => {
          const {x, y} = step;
          const isSwamp = room.lookForAt("terrain", x, y).some(
            (square) => {
              return square === 'swamp';
            }
          );

          if (isSwamp) {
            room.getPositionAt(x, y).createConstructionSite(STRUCTURE_ROAD);
            return made + 1;;
          }
          return made;
        },
        0
      );

      return builtCount + 1;
    },
    0
  );
}

export function setupExtensionSite(spawn, maxDistance=4) {
  const {room, pos} = spawn;
  const {x: posX, y: posY} = pos;

  // Basic cross - up/down/left/right of spawner for maxDistance
  for (let distance = 1; distance <= maxDistance; distance++) {
    const coords = [
      [posX - distance, posY],
      [posX, posY - distance],
      [posX + distance, posY],
      [posX, posY + distance]
    ];

    for (let coord of coords) {
      const [coordX, coordY] = coord;
      const tryPos = new RoomPosition(coordX, coordY, room.name);
      const res = tryPos.createConstructionSite(STRUCTURE_EXTENSION);

      if (res !== ERR_INVALID_TARGET) {
        return res;
      }
    }
  }

  return null;
}

export default function spawnerConstruction(spawn) {
  setupSwampRoads(spawn);
  const currentConstruction = spawn.room.find(FIND_MY_CONSTRUCTION_SITES);

  if (currentConstruction.every((site) => site.structureType !== STRUCTURE_EXTENSION)) {
    const ext = setupExtensionSite(spawn);
    if (ext !== OK) {
      return ext;
    }
  }

  return OK;
}
