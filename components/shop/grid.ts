// The ONE grid every shop list uses (the shop, a maker's page, a category), so the cards are the same size everywhere. A card is about 165 px wide on a phone and about 205 px on a laptop (they were 270 px).
// To change how many cards fit in a row, change it HERE; `productCardSizes` tells the browser how wide a card will be so it fetches a small enough picture, and must follow the columns.
export const productGrid = "grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 md:grid-cols-4 lg:grid-cols-5";
export const productCardSizes = "(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";
