export function openSides(source) {
  const {x: posX, y: posY} = source.pos;
  const {room} = source;
  const openSides = [];

  for (let dX = -1; dX < 2; dX++) {
    for (let dY = -1; dY < 2; dY++) {
      if (dX !== 0 || dY !== 0) {
        const lookX = posX + dX;
        const lookY = posY + dY;
        const cur = room.lookAt(lookX, lookY);

        const isClear = cur.every(
          (item) => {
            const {terrain = null} = item;
            return terrain !== "wall";
          }
        );

        if (isClear) {
          openSides.push([dX, dY]);
        }

      }
    }
  }

  return openSides;
}
