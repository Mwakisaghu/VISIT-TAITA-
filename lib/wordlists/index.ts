// The languages the passphrase suggester can offer. Each list loads only when someone asks for it (so thousands of words are not part of every page).
// TO ADD A LANGUAGE (for example a mother tongue of the Taita Hills): put a file lib/wordlists/<code>.ts that exports WORDS (plain words of one language, at least 600 of them, no hyphens or apostrophes),
// then add one line below. The tests check every list here automatically: size, spelling form, duplicates, and that none is too small to be strong.
export type WordList = { code: string; name: string; load: () => Promise<readonly string[]> };
export const WORD_LISTS: readonly WordList[] = [
  { code: "en", name: "English", load: async () => (await import("@/lib/wordlists/en")).WORDS },
  { code: "sw", name: "Kiswahili", load: async () => (await import("@/lib/wordlists/sw")).WORDS },
];
