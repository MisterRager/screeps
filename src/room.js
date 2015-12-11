export function creeps(room) {
  return room.find(FIND_MY_CREEPS);
}

export function sources(room) {
  return room.find(FIND_SOURCES);
}
