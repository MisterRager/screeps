function isSpaceTaken(room, x, y) {
  const spaceInfo = room.lookAt(x, y);
  return spaceInfo && spaceInfo.length
    && spaceInfo.every((info) => {
      return (info.type === "structure")
        || (info.type === "constructionSite")
        || (info.type === "terrain" && info.terrain === "wall")
    });
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
  const currentConstruction = spawn.room.find(FIND_MY_CONSTRUCTION_SITES);

  if (currentConstruction.every((site) => site.structureType !== STRUCTURE_EXTENSION)) {
    const ext = setupExtensionSite(spawn);
    if (ext !== OK) {
      return ext;
    }
  }

  return OK;
}
