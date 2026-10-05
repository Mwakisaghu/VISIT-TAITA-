"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { CREATOR_TRACKS } from "@/lib/creators";
import { MISSION_LIMITS as L, MISSION_STATUSES, MISSION_SUPPORTS, parsePrompts } from "@/lib/missions";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

export type MissionAdminResult = { success?: true; error?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) throw new Error("Admin access required.");
  return session.user;
}

function failure(err: unknown, what: string): MissionAdminResult {
  if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
  console.error(`[missions] ${what} failed`, err);
  return { error: "Something went wrong — please try again." };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
}

function revalidateAll(slug?: string) {
  revalidatePath("/admin/missions");
  revalidatePath("/admin");
  revalidatePath("/missions");
  revalidatePath("/crew");
  if (slug) revalidatePath(`/missions/${slug}`);
}

/**
 * Why a mission can't be OPENED yet, or null if it's ready. A mission has to be
 * claimable AND verifiable: at least one evidence prompt, a destination that is
 * published and can actually be checked in at (a QR code or coordinates), and a
 * deadline that hasn't already passed.
 */
async function openBlocker(m: { destinationId: string; prompts: string[]; closesAt: Date | null }): Promise<string | null> {
  if (m.prompts.length === 0) return "Add at least one evidence prompt before opening the mission.";
  if (m.closesAt && m.closesAt.getTime() <= Date.now()) return "The deadline has already passed — choose a later date.";

  const dest = await prisma.destination.findUnique({
    where: { id: m.destinationId },
    select: { name: true, status: true, checkinToken: true, latitude: true, longitude: true },
  });
  if (!dest) return "Choose a destination for this mission.";
  if (dest.status !== "PUBLISHED") return `${dest.name} isn't published yet — publish it before opening this mission.`;
  if (!dest.checkinToken && (dest.latitude === null || dest.longitude === null)) {
    return `${dest.name} has no check-in set up (no QR code and no coordinates), so a Field Note there couldn't be verified. Add one in the destination's settings first.`;
  }
  return null;
}

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export async function saveMission(id: string | null, formData: FormData): Promise<MissionAdminResult> {
  try {
    await requireAdmin();

    // ---- basics ----
    const title = text(formData, "title");
    if (title.length < L.titleMin || title.length > L.titleMax) return { error: `The title should be ${L.titleMin}–${L.titleMax} characters.` };
    const summary = text(formData, "summary");
    if (summary.length < L.summaryMin || summary.length > L.summaryMax) return { error: `The summary should be ${L.summaryMin}–${L.summaryMax} characters.` };
    const brief = text(formData, "brief");
    if (brief.length < L.briefMin || brief.length > L.briefMax) return { error: `The brief should be ${L.briefMin}–${L.briefMax} characters.` };

    const imageRaw = text(formData, "image");
    const image = imageRaw ? safeHttpUrl(imageRaw) : null;
    if (imageRaw && !image) return { error: "The image must be a web address starting with http:// or https://." };

    const campaign = text(formData, "campaign");
    if (campaign.length > L.campaignMax) return { error: `Keep the campaign name under ${L.campaignMax} characters.` };

    const destinationId = text(formData, "destinationId");
    if (!destinationId || !(await prisma.destination.findUnique({ where: { id: destinationId }, select: { id: true } }))) {
      return { error: "Choose a destination for this mission." };
    }

    const trackRaw = text(formData, "track");
    if (trackRaw && !(CREATOR_TRACKS as readonly string[]).includes(trackRaw)) return { error: "Choose who the mission is open to." };
    const track = (trackRaw || null) as (typeof CREATOR_TRACKS)[number] | null;

    const parsedPrompts = parsePrompts(String(formData.get("prompts") ?? ""));
    if (parsedPrompts.error) return { error: parsedPrompts.error };

    // ---- disclosure ----
    const support = text(formData, "support") || "NONE";
    if (!(MISSION_SUPPORTS as readonly string[]).includes(support)) return { error: "Choose how the mission is supported." };
    const supportNote = text(formData, "supportNote");
    const hostName = text(formData, "hostName");
    const sponsorId = text(formData, "sponsorId");
    if (supportNote.length > L.supportNoteMax) return { error: `Keep the support note under ${L.supportNoteMax} characters.` };
    if (hostName.length > L.hostNameMax) return { error: `Keep the host name under ${L.hostNameMax} characters.` };

    if (support === "HOSTED") {
      if (!hostName) return { error: "Say who is hosting the creator (for example the lodge or guide)." };
      if (!supportNote) return { error: "Say what the host provides (for example two nights and meals) — creators disclose it." };
    }
    if (support === "SPONSORED") {
      if (!sponsorId || !(await prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { id: true } }))) {
        return { error: "Choose the sponsor funding this mission." };
      }
      if (!supportNote) return { error: "Say what the sponsor provides — creators disclose it." };
    }

    // ---- numbers + dates ----
    const rewardRaw = text(formData, "rewardPoints");
    const rewardPoints = rewardRaw === "" ? 0 : Number(rewardRaw);
    if (!Number.isInteger(rewardPoints) || rewardPoints < 0 || rewardPoints > L.rewardPointsMax) {
      return { error: `Reward points should be a whole number from 0 to ${L.rewardPointsMax}.` };
    }

    const maxRaw = text(formData, "maxCreators");
    const maxCreators = maxRaw === "" ? null : Number(maxRaw);
    if (maxCreators !== null && (!Number.isInteger(maxCreators) || maxCreators < 1 || maxCreators > L.maxCreatorsMax)) {
      return { error: `Spots should be a whole number from 1 to ${L.maxCreatorsMax}, or blank for unlimited.` };
    }

    const closesRaw = text(formData, "closesAt");
    let closesAt: Date | null = null;
    if (closesRaw) {
      // End of the chosen day (UTC), so "closes 31 Dec" includes the 31st.
      closesAt = new Date(`${closesRaw}T23:59:59.999Z`);
      if (Number.isNaN(closesAt.getTime())) return { error: "That deadline isn't a valid date." };
    }

    const status = text(formData, "status") || "DRAFT";
    if (!(MISSION_STATUSES as readonly string[]).includes(status)) return { error: "Choose a status." };

    const existing = id ? await prisma.mission.findUnique({ where: { id }, select: { id: true, slug: true, spotsTaken: true, accommodationId: true, experienceId: true } }) : null;
    if (id && !existing) return { error: "Mission not found." };
    if (existing && maxCreators !== null && existing.spotsTaken > maxCreators) {
      return { error: `${existing.spotsTaken} creators already hold a spot — you can't set the limit below that.` };
    }

    // ---- featured listings (optional) ----
    // Must be a real, PUBLISHED listing — unless it's the one already saved on this mission, so an old mission can
    // still be edited after its listing was unpublished (it just isn't shown publicly until republished).
    const accommodationId = text(formData, "accommodationId");
    const experienceId = text(formData, "experienceId");
    if (accommodationId && accommodationId !== existing?.accommodationId) {
      const stay = await prisma.accommodation.findUnique({ where: { id: accommodationId }, select: { name: true, status: true } });
      if (!stay) return { error: "Choose a stay from the list." };
      if (stay.status !== "PUBLISHED") return { error: `${stay.name} isn't published yet — publish it before featuring it.` };
    }
    if (experienceId && experienceId !== existing?.experienceId) {
      const experience = await prisma.experience.findUnique({ where: { id: experienceId }, select: { name: true, status: true } });
      if (!experience) return { error: "Choose an experience from the list." };
      if (experience.status !== "PUBLISHED") return { error: `${experience.name} isn't published yet — publish it before featuring it.` };
    }

    if (status === "OPEN") {
      const blocker = await openBlocker({ destinationId, prompts: parsedPrompts.prompts, closesAt });
      if (blocker) return { error: blocker };
    }

    const data = {
      title,
      summary,
      brief,
      image,
      campaign: campaign || null,
      destinationId,
      track,
      prompts: parsedPrompts.prompts,
      support: support as (typeof MISSION_SUPPORTS)[number],
      // Clear the fields that don't apply, so a stale host or sponsor can't linger.
      supportNote: support === "NONE" ? null : supportNote,
      hostName: support === "HOSTED" ? hostName : null,
      sponsorId: support === "SPONSORED" ? sponsorId : null,
      rewardPoints,
      maxCreators,
      closesAt,
      accommodationId: accommodationId || null,
      experienceId: experienceId || null,
      status: status as (typeof MISSION_STATUSES)[number],
    };

    if (existing) {
      await prisma.mission.update({ where: { id: existing.id }, data });
      revalidateAll(existing.slug);
    } else {
      const root = slugify(title) || "mission";
      let slug = root;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!(await prisma.mission.findUnique({ where: { slug }, select: { id: true } }))) break;
        slug = `${root}-${Math.random().toString(36).slice(2, 6)}`;
      }
      await prisma.mission.create({ data: { ...data, slug } });
      revalidateAll(slug);
    }
    return { success: true };
  } catch (err) {
    return failure(err, "save");
  }
}

/** Quick open / close from the list. Opening runs the same readiness checks as the form. */
export async function setMissionStatus(missionId: string, status: string): Promise<MissionAdminResult> {
  try {
    await requireAdmin();
    if (!(MISSION_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };

    const mission = await prisma.mission.findUnique({ where: { id: String(missionId) } });
    if (!mission) return { error: "Mission not found." };

    if (status === "OPEN") {
      const blocker = await openBlocker({ destinationId: mission.destinationId, prompts: mission.prompts, closesAt: mission.closesAt });
      if (blocker) return { error: blocker };
    }

    await prisma.mission.update({ where: { id: mission.id }, data: { status: status as (typeof MISSION_STATUSES)[number] } });
    revalidateAll(mission.slug);
    return { success: true };
  } catch (err) {
    return failure(err, "status change");
  }
}

/** A mission that creators have claimed is part of their history, so it can only be closed, not deleted. */
export async function deleteMission(missionId: string): Promise<MissionAdminResult> {
  try {
    await requireAdmin();
    const mission = await prisma.mission.findUnique({ where: { id: String(missionId) }, select: { id: true, slug: true } });
    if (!mission) return { error: "Mission not found." };
    if ((await prisma.missionClaim.count({ where: { missionId: mission.id } })) > 0) {
      return { error: "Creators have claimed this mission, so it can't be deleted — close it instead." };
    }
    await prisma.mission.delete({ where: { id: mission.id } });
    revalidateAll(mission.slug);
    return { success: true };
  } catch (err) {
    return failure(err, "delete");
  }
}
