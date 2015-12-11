import * as Room from 'room';

export const role = "fighter";

export function target(creep) {
  if (creep.memory.target) {
    const savedTarget = Game.getObjectById(creep.memory.target);
    if (savedTarget) return savedTarget;
  }

  const eligibles = Room.nonSourceKeepers(creep.room);
  if (eligibles && eligibles.length) {
    const chosen = eligibles.map((enemy) => {
      return {
        path: creep.pos.findPathTo(enemy.pos),
        creep: enemy
      };
    }).sort((first, second) => {
      return ((first && first.length) ? first.length : 0)
        - ((second && second.length) ? second.length : 0);
    })[0];

    if (chosen) {
      creep.memory.target = chosen.creep.id;
      return chosen.creep;
    }
  }

  return null;
}

function clearTarget(creep) {
  creep.memory.target = undefined;
}

export default function fighter(creep) {
  if (creep) {
    const shootThis = target(creep);
    if (shootThis && shootThis.id) {
      const shootResult = creep.attack(shootThis);

      console.log("Fighter", creep.id, shootThis.id, shootResult);

        switch(shootResult) {
        case ERR_INVALID_TARGET:
          clearTarget(creep);
          break;
        case ERR_NOT_IN_RANGE:
          creep.moveTo(shootThis);
          break;
        }
    } else {
      console.log("shooting", shootThis);
    }
  }
}
