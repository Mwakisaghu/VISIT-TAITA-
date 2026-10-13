/** Marks a piece of text in data (a list of links, a table of labels) as translatable. It changes nothing: the page translates it where it is shown, with tr(). It lets the checks find every string. */
export const T = (text: string): string => text;
