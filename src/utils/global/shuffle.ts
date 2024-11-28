/**
 * Returns a given array in a random order
 * @param array The array to shuffle
 * @returns The shuffled arary
 */
const shuffle = <T extends any[]>(array: T): T[number][] => {
  let currentIndex = array.length;

  const newArray = [...array];

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]
    ] as [T[number], T[number]];
  }

  return newArray;
};

export { shuffle };