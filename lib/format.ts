export function categoryToSlug(category: string) {
  return category.toLowerCase();
}

export function slugToCategory(slug: string) {
  return slug.toUpperCase();
}

const CATEGORY_LABELS: Record<string, string> = {
  WILD: "Wild",
  CULTURE: "Culture",
  ADVENTURE: "Adventure",
  FOOD: "Food",
  SPORT: "Sport",
  PEOPLE: "People",
  CLOTHING: "Clothing",
  ART: "Art",
  CRAFTS: "Crafts",
  HOME: "Home",
  BOOKS: "Books",
  PHOTOGRAPHY: "Photography",
  COLLECTIBLES: "Collectibles",
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

const PROGRAM_LABELS: Record<string, string> = {
  TAITA_CUP: "Taita Cup",
  TAITA_WEEK: "Taita Week",
  TAITA_SOUND: "Taita Sound",
};

export function programLabel(program: string) {
  return PROGRAM_LABELS[program] ?? program;
}

export function formatEventDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatPrice(amountKes: number) {
  return `KES ${amountKes.toLocaleString("en-KE")}`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

const FULFILLMENT_LABELS: Record<string, string> = {
  SHIPPING: "Shipping",
  LOCAL_PICKUP: "Local pickup",
};

export function fulfillmentLabel(method: string) {
  return FULFILLMENT_LABELS[method] ?? method;
}
