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

const PARTNER_TYPE_LABELS: Record<string, string> = {
  ACCOMMODATION: "Accommodation",
  EXPERIENCE: "Experience provider",
  FOOD: "Food partner",
  TRANSPORT: "Transport",
  CREATOR: "Creator",
  SELLER: "Marketplace seller",
  EVENT: "Event partner",
  SPONSOR: "Sponsor",
};

export function partnerTypeLabel(type: string) {
  return PARTNER_TYPE_LABELS[type] ?? type;
}

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

export function applicationStatusLabel(status: string) {
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

const SESSION_CATEGORY_LABELS: Record<string, string> = {
  MUSIC: "Music",
  FOOD: "Food",
  CULTURE: "Culture",
  SPORT: "Sport",
  FAMILY: "Family",
  MARKET: "Market",
  TALKS: "Talks",
};

export function sessionCategoryLabel(category: string) {
  return SESSION_CATEGORY_LABELS[category] ?? category;
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  FREE: "Free",
  TICKETED: "Ticketed",
  SOLD_OUT: "Sold out",
};

export function ticketStatusLabel(status: string) {
  return TICKET_STATUS_LABELS[status] ?? status;
}

export function formatSessionTime(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatSessionDay(date: Date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const ACCOMMODATION_TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  LODGE: "Lodge",
  GUESTHOUSE: "Guesthouse",
  HOMESTAY: "Homestay",
  CAMPSITE: "Campsite",
};

export function accommodationTypeLabel(type: string) {
  return ACCOMMODATION_TYPE_LABELS[type] ?? type;
}

const EXPERIENCE_CATEGORY_LABELS: Record<string, string> = {
  WILDLIFE: "Wildlife",
  CULTURE: "Culture",
  ADVENTURE: "Adventure",
  FOOD: "Food",
  WELLNESS: "Wellness",
};

export function experienceCategoryLabel(category: string) {
  return EXPERIENCE_CATEGORY_LABELS[category] ?? category;
}
