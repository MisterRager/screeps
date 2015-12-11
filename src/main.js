// initialize game
import spawner from 'spawner';
import cleaner from 'cleaner';

for (var spawnName in Game.spawns) {
  cleaner();
  const spawn = Game.spawns[spawnName];
  if (spawn.my) {
    spawner(spawn);
  }
}
