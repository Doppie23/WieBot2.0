// @ts-check

/**
 * @typedef {Object} Pocket
 * @property {HTMLButtonElement} element
 * @property {number} value
 */

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
 * @param {HTMLButtonElement} button element that needs to be hovered
 * @param {Pocket[]} pockets elements to highlight
 */
function addEventListenersToOutsideButton(button, pockets) {
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
  button.addEventListener("click", () => {
    const numbers = [];
    pockets.forEach(({ value }) => {
      numbers.push(value);
    });
    console.log(numbers);
  });
}

(() => {
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

  addEventListenersToOutsideButton(
    range0112Button,
    getPocketsWhere(pockets, ({ value }) => value > 0 && value < 13),
  );
  addEventListenersToOutsideButton(
    range1324Button,
    getPocketsWhere(pockets, ({ value }) => value > 12 && value < 25),
  );
  addEventListenersToOutsideButton(
    range2536Button,
    getPocketsWhere(pockets, ({ value }) => value > 24 && value < 37),
  );
  addEventListenersToOutsideButton(
    range0118Button,
    getPocketsWhere(pockets, ({ value }) => value > 0 && value < 19),
  );
  addEventListenersToOutsideButton(
    parityEvenButton,
    getPocketsWhere(pockets, ({ value }) => value % 2 === 0),
  );
  addEventListenersToOutsideButton(
    colorRedButton,
    getPocketsWhere(pockets, ({ element: el }) =>
      el.classList.contains("pocket-red"),
    ),
  );
  addEventListenersToOutsideButton(
    colorBlackButton,
    getPocketsWhere(pockets, ({ element: el }) =>
      el.classList.contains("pocket-black"),
    ),
  );
  addEventListenersToOutsideButton(
    parityOddButton,
    getPocketsWhere(pockets, ({ value }) => value % 2 !== 0),
  );
  addEventListenersToOutsideButton(
    range1936Button,
    getPocketsWhere(pockets, ({ value }) => value > 18 && value < 37),
  );

  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  addEventListenersToOutsideButton(
    row1Button,
    getPocketsWhere(pockets, ({ value }) => row1.includes(value)),
  );
  addEventListenersToOutsideButton(
    row2Button,
    getPocketsWhere(pockets, ({ value }) => row2.includes(value)),
  );
  addEventListenersToOutsideButton(
    row3Button,
    getPocketsWhere(pockets, ({ value }) => row3.includes(value)),
  );

  // const between36 = document.querySelector(".between36");
  // if (!between36) throw new Error("Could not find .between36");
  // addEventListenersToOutsideButton(
  //   between36,
  //   getPocketsWhere(pockets, ({ value }) => value === 3 || value === 6),
  // );
})();
