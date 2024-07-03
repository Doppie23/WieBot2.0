import { Paard, Paardenrace } from "../commands/rng/paardenrace";

const totalRaces = 100_000;

const wins = new Map<string, number>();
let winner: Paard | undefined = undefined;
for (let i = 0; i < totalRaces; i++) {
  const paardenrace = new Paardenrace();
  while (!winner) {
    winner = paardenrace.tick();
  }
  if (wins.has(winner.name)) {
    wins.set(winner.name, wins.get(winner.name)! + 1);
  } else {
    wins.set(winner.name, 1);
  }
  winner = undefined;
}

const results = [];
for (const [key, value] of wins.entries()) {
  results.push({ name: key, value: value / totalRaces });
}
results.sort((a, b) => b.value - a.value);
for (const result of results) {
  console.log(`${result.name} | ${result.value * 100}%`);
}

console.log("ODDS:");
for (const result of results) {
  console.log(result.value.toFixed(4));
}
