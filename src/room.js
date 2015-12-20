export function creeps(room) {
  return room.find(FIND_MY_CREEPS);
}

export function sources(room) {
  return room.find(FIND_SOURCES);
}

export function enemies(room) {
  return room.find(FIND_HOSTILE_CREEPS);
}

export function nonSourceKeepers(roomOrEnemies) {
  const enemyArr = roomOrEnemies.controller ? enemies(roomOrEnemies) : roomOrEnemies;
  return enemyArr.filter((creep) => creep.owner.username !== 'Source Keeper');
}

export function underAttack(room) {
  const hostiles = nonSourceKeepers(room);
  return hostiles && hostiles.length > 0;
}

export function groundScores(room) {
  return room.find(FIND_DROPPED_RESOURCES);
}

export function exits(room) {
  return room.find(FIND_EXIT);
}

export function structures(room) {
  return room.find(FIND_MY_STRUCTURES);
}
