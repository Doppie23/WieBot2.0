// @ts-check

/**
 * @typedef {Object} Pocket
 * @property {HTMLButtonElement} element
 * @property {number} value
 */
/**
 * @typedef {Object} Bet
 * @property {HTMLElement} chipElement
 * @property {number} betAmount
 * @property {Pocket[]} pockets
 */

(() => {
  /** @type {Bet[]} */
  const bets = [];
  const clearBets = () => {
    bets.forEach((bet) => {
      bet.chipElement.remove();
    });
    bets.length = 0;
  };
  const stringifyBets = () =>
    bets.map((bet) => {
      return {
        amount: bet.betAmount,
        pockets: bet.pockets.map(({ value }) => value),
      };
    });

  /** @type {HTMLInputElement | null} */
  const betAmountInput = document.querySelector(".bet-amount");
  if (!betAmountInput) throw new Error("Could not find .bet-amount");

  /** @type {HTMLButtonElement | null} */
  const clearButton = document.querySelector(".clear-button");
  if (!clearButton) throw new Error("Could not find .clear-button");
  /** @type {HTMLButtonElement | null} */
  const copyButton = document.querySelector(".copy-button");
  if (!copyButton) throw new Error("Could not find .copy-button");

  const pockets = getPockets();

  clearButton.addEventListener("click", clearBets);

  copyButton.addEventListener("click", () => {
    if (bets.length === 0) {
      alert("Plaats eerst een bet!");
      return;
    }

    const values = stringifyBets();
    if (values.length > 4000) {
      alert("Je hebt teveel bets geplaatst :'(");
      return;
    }

    navigator.clipboard.writeText(JSON.stringify(values));
    console.log(JSON.stringify(values));

    clearBets();

    // alert("Je bets staan nu in je klembord!");
    const text = copyButton.innerText;
    copyButton.innerText = "Gekopieërd!";
    setTimeout(() => {
      copyButton.innerText = text;
    }, 1000);
  });

  const onBetPlaced = (
    /** @type {Pocket[]} */ pockets,
    /** @type {Event} */ event,
  ) => {
    const betAmount = parseInt(betAmountInput.value);
    if (isNaN(betAmount)) {
      betAmountInput.classList.add("error");
      setTimeout(() => {
        betAmountInput.classList.remove("error");
      }, 500);
      return;
    }

    if (!event.target || !(event.target instanceof Element)) {
      // throw new Error("Could not find element to append chip to");
      console.error("Could not find element to append chip to", event);
      return;
    }

    const chip = createChip();
    event.target.appendChild(chip);

    bets.push({
      betAmount,
      pockets,
      chipElement: chip,
    });
  };

  addAllEventListeners(pockets, onBetPlaced);
})();

function createChip() {
  const chip = document.createElement("div");
  chip.classList.add("chip");
  chip.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 50%)`;
  chip.style.left = `calc(50% + ${Math.floor(Math.random() * 8 - 4)}px)`;
  chip.style.top = `calc(50% + ${Math.floor(Math.random() * 8 - 4)}px)`;
  return chip;
}

function getPockets() {
  const numberSelectors = [
    ".number3",
    ".number6",
    ".number9",
    ".number12",
    ".number15",
    ".number18",
    ".number21",
    ".number24",
    ".number27",
    ".number30",
    ".number33",
    ".number36",
    ".number2",
    ".number5",
    ".number8",
    ".number11",
    ".number14",
    ".number17",
    ".number20",
    ".number23",
    ".number26",
    ".number29",
    ".number32",
    ".number35",
    ".number1",
    ".number4",
    ".number7",
    ".number10",
    ".number13",
    ".number16",
    ".number19",
    ".number22",
    ".number25",
    ".number28",
    ".number31",
    ".number34",
  ];

  const pockets = numberSelectors
    .map((selector) => {
      /** @type {HTMLButtonElement | null} */
      const element = document.querySelector(selector);

      if (element === null) {
        console.error("Could not find element for", selector);
        return null;
      }

      return element;
    })
    .map((element) => {
      if (element === null) return null;

      const parsed = parseInt(element.textContent ?? "");
      if (isNaN(parsed)) {
        console.error("Could not find value for", element);
        return null;
      }

      return {
        element,
        value: parsed,
      };
    })
    .filter((obj) => obj !== null);

  return pockets;
}

/**
 * @param {Pocket[]} pockets
 * @param {(pockets: Pocket[], event: Event) => void} onBetPlaced
 */
function addAllEventListeners(pockets, onBetPlaced) {
  pockets.forEach((pocket) => {
    pocket.element.addEventListener("click", (e) => {
      onBetPlaced([pocket], e);
    });
  });

  /** @type {HTMLButtonElement | null} */
  const zero = document.querySelector(".number0");
  if (!zero) throw new Error("Could not find .number0");
  zero.addEventListener("click", (e) => {
    onBetPlaced([{ element: zero, value: 0 }], e);
  });

  ///////////////////////////////////////////////////////////////////////////////////////////
  // All outside buttons
  ///////////////////////////////////////////////////////////////////////////////////////////

  /** @type {HTMLButtonElement | null} */
  const range0112Button = document.querySelector(".range0112");
  if (!range0112Button) throw new Error("Could not find .range0112");
  /** @type {HTMLButtonElement | null} */
  const range1324Button = document.querySelector(".range1324");
  if (!range1324Button) throw new Error("Could not find .range1324");
  /** @type {HTMLButtonElement | null} */
  const range2536Button = document.querySelector(".range2536");
  if (!range2536Button) throw new Error("Could not find .range2536");
  /** @type {HTMLButtonElement | null} */
  const range0118Button = document.querySelector(".range0118");
  if (!range0118Button) throw new Error("Could not find .range0118");
  /** @type {HTMLButtonElement | null} */
  const parityEvenButton = document.querySelector(".parityEven");
  if (!parityEvenButton) throw new Error("Could not find .parityEven");
  /** @type {HTMLButtonElement | null} */
  const colorRedButton = document.querySelector(".colorRed");
  if (!colorRedButton) throw new Error("Could not find .colorRed");
  /** @type {HTMLButtonElement | null} */
  const colorBlackButton = document.querySelector(".colorBlack");
  if (!colorBlackButton) throw new Error("Could not find .colorBlack");
  /** @type {HTMLButtonElement | null} */
  const parityOddButton = document.querySelector(".parityOdd");
  if (!parityOddButton) throw new Error("Could not find .parityOdd");
  /** @type {HTMLButtonElement | null} */
  const range1936Button = document.querySelector(".range1936");
  if (!range1936Button) throw new Error("Could not find .range1936");
  /** @type {HTMLButtonElement | null} */
  const row1Button = document.querySelector(".row1");
  if (!row1Button) throw new Error("Could not find .row1");
  /** @type {HTMLButtonElement | null} */
  const row2Button = document.querySelector(".row2");
  if (!row2Button) throw new Error("Could not find .row2");
  /** @type {HTMLButtonElement | null} */
  const row3Button = document.querySelector(".row3");
  if (!row3Button) throw new Error("Could not find .row3");

  addEventListenersForMultiSelect(
    range0112Button,
    getPocketsWhere(pockets, ({ value }) => value > 0 && value < 13),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    range1324Button,
    getPocketsWhere(pockets, ({ value }) => value > 12 && value < 25),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    range2536Button,
    getPocketsWhere(pockets, ({ value }) => value > 24 && value < 37),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    range0118Button,
    getPocketsWhere(pockets, ({ value }) => value > 0 && value < 19),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    parityEvenButton,
    getPocketsWhere(pockets, ({ value }) => value % 2 === 0),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    colorRedButton,
    getPocketsWhere(pockets, ({ element: el }) =>
      el.classList.contains("pocket-red"),
    ),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    colorBlackButton,
    getPocketsWhere(pockets, ({ element: el }) =>
      el.classList.contains("pocket-black"),
    ),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    parityOddButton,
    getPocketsWhere(pockets, ({ value }) => value % 2 !== 0),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    range1936Button,
    getPocketsWhere(pockets, ({ value }) => value > 18 && value < 37),
    onBetPlaced,
  );

  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  addEventListenersForMultiSelect(
    row1Button,
    getPocketsWhere(pockets, ({ value }) => row1.includes(value)),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    row2Button,
    getPocketsWhere(pockets, ({ value }) => row2.includes(value)),
    onBetPlaced,
  );
  addEventListenersForMultiSelect(
    row3Button,
    getPocketsWhere(pockets, ({ value }) => row3.includes(value)),
    onBetPlaced,
  );

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Between pockets
  ///////////////////////////////////////////////////////////////////////////////////////////

  const table = document.querySelector(".table");
  if (!table) throw new Error("Could not find .table");

  let row = 0;
  let col = 0;
  for (let i = 0; i < pockets.length; i++) {
    const pocket = pockets[i];
    const neighbourRight = pockets[i + 1];
    const neighbourBottom = pockets[i + row1.length];
    const neighbourBottomRight = pockets[i + row1.length + 1];

    if (neighbourBottom) {
      const el = document.createElement("div");
      el.classList.add("between-pocket");
      el.style.left = `calc(var(--square-size) * ${
        col + 1
      } + var(--square-gap) * ${col + 1} + var(--square-size) / 2)`;
      el.style.top = `calc(var(--square-size) * ${
        row + 1
      } + var(--square-gap) / 2 + var(--square-gap) * ${row})`;

      addEventListenersForMultiSelect(
        el,
        getPocketsWhere(
          pockets,
          ({ value }) =>
            value === pocket.value || value === neighbourBottom.value,
        ),
        onBetPlaced,
      );

      table.appendChild(el);
    }

    if (pocket.value === 36 || pocket.value === 35 || pocket.value === 34) {
      // reached edge, skip right and bottom right divs
      row++;
      col = 0;
      continue;
    }

    if (neighbourBottomRight) {
      const el = document.createElement("div");
      el.classList.add("between-pocket");
      el.style.left = `calc((var(--square-size) + var(--square-gap)) * ${
        2 + col
      } - var(--square-gap) / 2)`;
      el.style.top = `calc(var(--square-size) * ${
        row + 1
      } + var(--square-gap) / 2 + var(--square-gap) * ${row})`;

      addEventListenersForMultiSelect(
        el,
        getPocketsWhere(
          pockets,
          ({ value }) =>
            value === pocket.value ||
            value === neighbourRight.value ||
            value === neighbourBottom.value ||
            value === neighbourBottomRight.value,
        ),
        onBetPlaced,
      );

      table.appendChild(el);
    }

    const el = document.createElement("div");
    el.classList.add("between-pocket");
    el.style.left = `calc((var(--square-size) + var(--square-gap)) * ${
      2 + col
    } - var(--square-gap) / 2)`;
    el.style.top = `calc(var(--square-size) / 2 + (var(--square-size) + var(--square-gap)) * ${row} )`;

    addEventListenersForMultiSelect(
      el,
      getPocketsWhere(
        pockets,
        ({ value }) => value === pocket.value || value === neighbourRight.value,
      ),
      onBetPlaced,
    );

    table.appendChild(el);

    col++;
  }
}

/**
 *
 * @param {Pocket[]} pockets
 * @param {(pocket: Pocket) => boolean} predicate
 * @returns {Pocket[]}
 */
function getPocketsWhere(pockets, predicate) {
  return pockets
    .map((pocket) => {
      if (!predicate(pocket)) {
        return null;
      }
      return pocket;
    })
    .filter((number) => number !== null);
}

/**
 * @param {Element} button element that needs to be hovered
 * @param {Pocket[]} pockets elements to highlight
 * @param {((pockets: Pocket[], event: Event) => void)=} onClick
 */
function addEventListenersForMultiSelect(button, pockets, onClick) {
  button.addEventListener("pointerenter", () => {
    pockets.forEach(({ element }) => {
      element.classList.add("hovered");
    });
  });
  button.addEventListener("pointerleave", () => {
    pockets.forEach(({ element }) => {
      element.classList.remove("hovered");
    });
  });
  button.addEventListener("click", (e) => {
    onClick?.(pockets, e);
  });
}
