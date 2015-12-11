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
