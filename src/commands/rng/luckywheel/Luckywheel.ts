import random from "../../../utils/random";

export class LuckyWheel {
  private readonly options: number[];
  private bigWinAvailable: boolean = true;

  constructor() {
    this.options = this.createRandomOptionsArray(3);
  }

  private createRandomOptionsArray(size: number): number[] {
    const options = [];
    for (let i = 0; i < size; i++) {
      options.push(this.getRandomOption());
    }
    return options;
  }

  private getRandomOption(): number {
    if (this.bigWinAvailable) {
      const bigWin = random.choices([false, true], [9, 1]);
      if (bigWin) {
        this.bigWinAvailable = false;
        return 5000;
      }
    }

    const option = random.randrange(5, 100);
    const positive = random.choices([true, false], [9, 1]);
    return option * (positive ? 1 : -1);
  }

  get currentOptions() {
    return this.options;
  }

  public rollOneStep() {
    this.options.pop();
    this.options.unshift(this.getRandomOption());
  }
}