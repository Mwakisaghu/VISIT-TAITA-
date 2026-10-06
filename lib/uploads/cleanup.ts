import { prisma } from "@/lib/prisma";
import type { StorageDriver } from "@/lib/uploads/storage";

/** Every place an uploaded picture's address can be saved. Anything not listed here is not protected from clean-up. */
const PLACES: { model: string; field: string; array?: boolean }[] = [
  { model: "destination", field: "image" }, { model: "story", field: "image" }, { model: "sportVenue", field: "image" },
  { model: "sportPlayer", field: "photo" }, { model: "product", field: "image" }, { model: "festivalVenue", field: "image" },
  { model: "accommodation", field: "image" }, { model: "experience", field: "image" }, { model: "sponsor", field: "logo" },
  { model: "reward", field: "image" }, { model: "creator", field: "avatar" }, { model: "mission", field: "image" },
  { model: "fieldNote", field: "photos", array: true },
];

export type CleanupDb = Pick<typeof prisma, "uploadedImage"> & Record<string, any>;

/** Which of these addresses are actually used somewhere on the site. */
export async function referencedUrls(db: CleanupDb, urls: string[]): Promise<Set<string>> {
  const used = new Set<string>();
  if (urls.length === 0) return used;
  await Promise.all(
    PLACES.map(async ({ model, field, array }) => {
      const rows: Record<string, unknown>[] = await db[model].findMany({ where: { [field]: array ? { hasSome: urls } : { in: urls } }, select: { [field]: true } });
      for (const r of rows) for (const v of ([] as unknown[]).concat(r[field] ?? [])) if (typeof v === "string") used.add(v);
    })
  );
  return used;
}

/**
 * Deletes uploaded pictures that nothing uses any more (a replaced photo, or an upload that was never saved into a form) once
 * they are a week old. The week is a grace period: a picture uploaded into a form that is still open is safe. A failure to
 * delete a file leaves its record so it is tried again next time — nothing is forgotten, nothing is half-deleted.
 */
export async function purgeOrphanUploads(db: CleanupDb, storage: StorageDriver, now: Date = new Date(), olderThanDays = 7, limit = 200) {
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
  const old: { id: string; key: string; url: string }[] = await db.uploadedImage.findMany({ where: { createdAt: { lt: cutoff } }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true, key: true, url: true } });
  const used = await referencedUrls(db, old.map((o) => o.url));
  let deleted = 0, failed = 0;
  for (const o of old) {
    if (used.has(o.url)) continue;
    try {
      await storage.remove(o.key);
      await db.uploadedImage.delete({ where: { id: o.id } });
      deleted++;
    } catch {
      failed++;
    }
  }
  return { checked: old.length, deleted, kept: old.length - deleted - failed, failed };
}

/** Deletes specific pictures (a deleted account's): the file first, then the record. Returns how many were removed. */
export async function deleteUploads(db: CleanupDb, storage: StorageDriver, rows: { id: string; key: string }[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    try {
      await storage.remove(r.key);
      await db.uploadedImage.delete({ where: { id: r.id } });
      n++;
    } catch {
      // left in place; the weekly clean-up will find it
    }
  }
  return n;
}

/**
 * Removes a person's pictures when their account is deleted — EXCEPT any that something staying on the site still uses (those
 * are left, and the weekly clean-up removes them once nothing uses them). Returns how many were removed.
 */
export async function deleteUnusedUploads(db: CleanupDb, storage: StorageDriver, rows: { id: string; key: string; url: string }[]): Promise<number> {
  if (rows.length === 0) return 0;
  const used = await referencedUrls(db, rows.map((r) => r.url));
  return deleteUploads(db, storage, rows.filter((r) => !used.has(r.url)));
}
