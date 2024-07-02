function randrange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choices<T>(population: T[], weights: number[]): T {
  if (weights.length !== population.length) {
    throw new Error("The number of weights does not match the population");
  }

  // Create the cumulative weights array
  let cumWeights: number[] = [];
  let sum = 0;
  for (let weight of weights) {
    sum += weight;
    cumWeights.push(sum);
  }

  if (sum <= 0) {
    throw new Error("Total of weights must be greater than zero");
  }

  let randomValue = Math.random() * sum;
  for (let i = 0; i < cumWeights.length; i++) {
    if (randomValue < cumWeights[i]!) {
      return population[i]!;
    }
  }

  throw new Error("Could not get random value");
}

const random = {
  randrange,
  choices,
};

export default random;
