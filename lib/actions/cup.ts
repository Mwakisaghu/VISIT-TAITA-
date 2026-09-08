"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

const venueSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  image: z.string().url(),
});

export async function saveVenue(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = venueSchema.parse({
    name: formData.get("name"),
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    image: formData.get("image"),
  });

  if (id) {
    await prisma.sportVenue.update({ where: { id }, data: parsed });
  } else {
    await prisma.sportVenue.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
      },
    });
  }

  revalidatePath("/admin/cup/venues");
  revalidatePath("/events/taita-cup");
  redirect("/admin/cup/venues");
}

export async function deleteVenue(id: string) {
  await requireAdmin();
  await prisma.sportVenue.delete({ where: { id } });
  revalidatePath("/admin/cup/venues");
  revalidatePath("/events/taita-cup");
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

const teamSchema = z.object({
  name: z.string().min(2),
  town: z.string().min(2),
  crest: z.string().min(1).max(4),
});

export async function saveTeam(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = teamSchema.parse({
    name: formData.get("name"),
    town: formData.get("town"),
    crest: formData.get("crest"),
  });

  if (id) {
    await prisma.sportTeam.update({ where: { id }, data: parsed });
  } else {
    await prisma.sportTeam.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
      },
    });
  }

  revalidatePath("/admin/cup/teams");
  revalidatePath("/events/taita-cup");
  redirect("/admin/cup/teams");
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  await prisma.sportTeam.delete({ where: { id } });
  revalidatePath("/admin/cup/teams");
  revalidatePath("/events/taita-cup");
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

const playerSchema = z.object({
  name: z.string().min(2),
  position: z.string().min(2),
  number: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  teamId: z.string().min(1),
});

export async function savePlayer(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = playerSchema.parse({
    name: formData.get("name"),
    position: formData.get("position"),
    number: formData.get("number"),
    teamId: formData.get("teamId"),
  });

  if (id) {
    await prisma.sportPlayer.update({ where: { id }, data: parsed });
  } else {
    await prisma.sportPlayer.create({ data: { ...parsed, isDemo: false } });
  }

  revalidatePath("/admin/cup/players");
  revalidatePath("/events/taita-cup");
  redirect("/admin/cup/players");
}

export async function deletePlayer(id: string) {
  await requireAdmin();
  await prisma.sportPlayer.delete({ where: { id } });
  revalidatePath("/admin/cup/players");
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fixtureSchema = z.object({
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  venueId: z.string().min(1),
  kickoff: z.coerce.date(),
  round: z.string().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]),
  homeScore: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  awayScore: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
});

export async function saveFixture(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = fixtureSchema.parse({
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    venueId: formData.get("venueId"),
    kickoff: formData.get("kickoff"),
    round: formData.get("round") || undefined,
    status: formData.get("status"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });

  if (parsed.homeTeamId === parsed.awayTeamId) {
    throw new Error("Home and away team must be different.");
  }

  const data = {
    ...parsed,
    homeScore: parsed.homeScore ?? null,
    awayScore: parsed.awayScore ?? null,
  };

  if (id) {
    await prisma.sportFixture.update({ where: { id }, data });
  } else {
    await prisma.sportFixture.create({ data: { ...data, isDemo: false } });
  }

  revalidatePath("/admin/cup/fixtures");
  revalidatePath("/events/taita-cup");
  redirect("/admin/cup/fixtures");
}

export async function deleteFixture(id: string) {
  await requireAdmin();
  await prisma.sportFixture.delete({ where: { id } });
  revalidatePath("/admin/cup/fixtures");
  revalidatePath("/events/taita-cup");
}
