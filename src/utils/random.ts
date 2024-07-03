import fs from "node:fs";
import path from "node:path";

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

function choice<T>(population: T[]): T {
  return population[randrange(0, population.length - 1)]!;
}

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function fileFromDir(dir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dir)) {
      return reject(new Error(`Directory ${dir} does not exist`));
    }

    fs.readdir(dir, (e, files) => {
      if (e) return reject(e);

      const file = random.choice(files);
      resolve(path.join(dir, file));
    });
  });
}

const random = {
  randrange,
  choices,
  choice,
  shuffle,
  fileFromDir,
};

export default random;
