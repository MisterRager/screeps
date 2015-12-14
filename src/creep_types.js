const BodyPrices = () => {
  const prices = {};

  prices[MOVE] = 50;
  prices[WORK] = 100;
  prices[CARRY] = 50;
  prices[ATTACK] = 80;
  prices[RANGED_ATTACK] = 150;
  prices[HEAL] = 250;
  prices[TOUGH] = 10;

  return prices;
}();

const STARTING_ENERGY = 300;

export default class CreepTypes {
  static bodyCost(bodyParts) {
    let res = bodyParts.reduce(
      (total, partName) => total + Number.parseInt(BodyPrices[partName]),
      0
    );
    return res;
  }

  static tierFunction(tiers) {
    const costTable = tiers.map(
      (tier) => [this.bodyCost(tier), tier]
    ).sort(
      (one, two) => two[0] - one[0]
    );

    return (maxEnergy = STARTING_ENERGY) => {
      const tier = costTable.find(
        (row) => row[0] <= maxEnergy
      );

      return tier ? tier[1] : [];
    };
  }
}
