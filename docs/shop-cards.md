# Shop cards

Every product list in the shop (the shop page, a category, a maker's page) draws its products with **one card**, `components/shop/MakerProductCard.tsx`, in **one grid**, `components/shop/grid.ts`.

- **Size:** about 165 px wide on a phone and 205 px on a laptop (they were 270 px). 2 cards across on a phone, 3 on a larger phone, 4 on a tablet, 5 on a laptop. To change it, change `productGrid` in `grid.ts`, and `productCardSizes` beside it (it tells the browser how wide a card will be, so it fetches a small enough picture); `tests/shop_cards_test.tsx` pins the two together.
- **The card:** a 4:5 picture with the **"Made in Taita" badge** (the same corner on every card) and a round **quick-add** button; then the title in a fixed two-line slot, the price, and, when the maker is public, **who made it and where**, pinned to the bottom so a row lines up.
- **The title** is shortened for the card only (`cardTitle` in `lib/shop-card.ts`): the leading "Visit Taita " is dropped and a dash before the variant becomes a middle dot. The product's real name is unchanged on its page, in the cart and in orders. To show full names on cards, make `cardTitle` return the name as it is.
- **Quick add:** a product with **nothing to choose** is added to the cart straight away (a tick shows for a moment, and the news is announced to screen readers). A product with **sizes or other choices** can never be added without choosing, so the same button is a link to the product page ("Choose a size for ..."): the choice is never skipped.
- **Makers and consent:** a maker is shown on a card only when they are public (consent recorded). Every list passes the maker through the same check; a maker without consent, or only a draft, never appears (no name, no link), and the card shows only the badge.
- **The whole card is one link** (through the title), so the button and the maker link are never nested inside another link.
- **Tests:** `tests/shop_cards_test.tsx` (the card, the grid, the pages, the consent rule) and `tests/shop_cards_dom_test.tsx` (the quick-add button in a browser).
