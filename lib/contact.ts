export const CONTACT_TOPICS = [
  { value: "GENERAL", label: "A general question" },
  { value: "PARTNERSHIP", label: "Partnering with us" },
  { value: "SPONSORSHIP", label: "Sponsorship" },
  { value: "PRESS", label: "Press and media" },
  { value: "PRIVACY", label: "A privacy request" },
  { value: "PROBLEM", label: "Report a problem" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const CONTACT_LIMITS = { nameMin: 2, nameMax: 80, messageMin: 10, messageMax: 2000 } as const;

export function topicLabel(value: string) {
  return CONTACT_TOPICS.find((t) => t.value === value)?.label ?? value;
}
