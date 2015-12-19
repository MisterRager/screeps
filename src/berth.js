import * as Source from 'source';

export default class Berth {
  constructor(source, offsetX, offsetY) {
    if (source.id) {
      this.source = source;
      this.source_id = source.id;
    } else {
      this.source_id = source;
    }
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  path(thing) {
    return thing.pos.findPathTo(
      thing.room.getPositionAt(
        this.getSource().pos.x + this.offsetX,
        this.getSource().pos.y + this.offsetY
      ),
      {ignoreCreeps: true}
    );
  }

  distance(thing) {
    return this.path(thing).length;
  }

  getSource() {
    return this.source = this.source || Game.getObjectById(this.source_id);
  }

  serialize() {
    return JSON.stringify([this.source_id, this.offsetX, this.offsetY]);
  }

  position(room) {
    const source = this.getSource();
    const {pos} = source;
    const {x, y} = pos;
    return room.getPositionAt(x + this.offsetX, y + this.offsetY);
  }

  equals(other) {
    return other
      && other.source_id && other.source_id === this.source_id
      && other.offsetX && other.offsetX === this.offsetX
      && other.offsetY && other.offsetY === this.offsetY;
  }

  static sourceBerths(source) {
    const rawBerths = Source.openSides(source);
    return rawBerths.map(
      (berthOffsets) => {
        const [x, y] = berthOffsets;
        return new Berth(source, x, y);
      }
    );
  }

  static unserialize(serialStr) {
    const berthArr = JSON.parse(serialStr);

    if (berthArr && berthArr.length === 3) {
      const [source_id, offsetX, offsetY] = berthArr;
      if (source_id !== undefined
        && offsetX !== undefined
        && offsetY !== undefined
        ) {
        return new Berth(source_id, offsetX, offsetY);
      }
    }

    return null;
  }
}
