export function openSides(source, debug = false) {
  const {x: posX, y: posY} = source.pos;
  const surroundings = source.room.lookForAtArea(
    "terrain",
    posX - 1, posY - 1,
    posX + 1, posY + 1
  );
  const openSides = []

  for (let stepX in surroundings) {
    for (let stepY in surroundings[stepX]) {
      if (stepX != posX || stepY != posY) {
        const cur = surroundings[stepX][stepY];
        if (cur && cur.length && cur[0] !== "wall") {
          openSides.push([stepX - posX, stepY - posY]);
        }
      }
    }
  }
  return openSides;
}
