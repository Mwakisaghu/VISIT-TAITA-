// Event tickets: the database operations. Everything that must happen exactly once is an atomic claim:
//   - seats and numbers: compare-and-swap on the event's counters, so two people can't take the last seat or the same number;
//   - a payment is confirmed once, and one M-Pesa code can confirm only one reservation;
//   - a ticket is admitted once (VALID -> USED), so a second person with the same ticket is turned away.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { claimOk, formatNumber, holdExpiry, LIVE_STATUSES, prefixFromName, salesOpen, uniquePrefix, validateReservation, type TicketModeKey, type TicketSettings } from "@/lib/ticket";
import { newGroupId, newTicketSecret } from "@/lib/ticket-secret";

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;
export type Fail = { ok: false; error: string };

/** Changes the number of seats in use by `delta`, never below zero, refusing to go over the capacity. Compare-and-swap, so it is safe under races. */
async function adjustTaken(tx: Tx, eventId: string, delta: number): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    const e = await tx.event.findUnique({ where: { id: eventId }, select: { ticketsTaken: true, ticketCapacity: true } });
    if (!e) return false;
    const next = Math.max(0, e.ticketsTaken + delta);
    if (delta > 0 && e.ticketCapacity !== null && next > e.ticketCapacity) return false;
    const r = await tx.event.updateMany({ where: { id: eventId, ticketsTaken: e.ticketsTaken }, data: { ticketsTaken: next } });
    if (r.count === 1) return true;
  }
  throw new Error("BUSY");
}

// ---------------------------------------------------------------------------------------------------------------- settings
export async function saveSettings(db: Db, eventId: string, v: TicketSettings, organiserEmail: string): Promise<{ ok: true; prefix: string | null } | Fail> {
  const e = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, ticketPrefix: true, ticketsTaken: true, ticketing: true } });
  if (!e) return { ok: false, error: "Event not found." };
  if (v.ticketCapacity !== null && v.ticketCapacity < e.ticketsTaken) return { ok: false, error: `${e.ticketsTaken} ticket${e.ticketsTaken === 1 ? " is" : "s are"} already issued, so the number of tickets can't be set below that.` };
  if (v.ticketing !== "PAID" && e.ticketing === "PAID") {
    const waiting = await db.ticket.count({ where: { eventId, status: "PENDING_PAYMENT" } });
    if (waiting > 0) return { ok: false, error: `${waiting} reservation${waiting === 1 ? " is" : "s are"} still waiting for payment. Confirm or cancel ${waiting === 1 ? "it" : "them"} before making this event free or turning tickets off.` };
  }
  let organiserId: string | null = null; const email = organiserEmail.trim().toLowerCase();
  if (email) {
    const u = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!u || u.role !== "PARTNER") return { ok: false, error: "There's no partner account with that email. The organiser must have a partner (host) account on this site." };
    organiserId = u.id;
  }
  let prefix = e.ticketPrefix;
  if (v.ticketing !== "OFF" && !prefix) {
    for (let i = 0; i < 6 && !prefix; i++) {
      const taken = (await db.event.findMany({ where: { ticketPrefix: { not: null } }, select: { ticketPrefix: true } })).map((x) => x.ticketPrefix as string);
      const candidate = uniquePrefix(prefixFromName(e.name), taken);
      try { await db.event.update({ where: { id: eventId }, data: { ticketPrefix: candidate } }); prefix = candidate; } catch (err) { if ((err as { code?: string }).code !== "P2002") throw err; }
    }
    if (!prefix) return { ok: false, error: "Couldn't pick a ticket code for this event — please try again." };
  }
  await db.event.update({ where: { id: eventId }, data: { ...v, organiserId } });
  return { ok: true, prefix };
}

// ---------------------------------------------------------------------------------------------------------------- reserving
export type Reserved = { ok: true; groupId: string; mode: TicketModeKey; tickets: Array<{ id: string; number: string; secret: string }>; event: { id: string; name: string } };

export async function reserveTickets(db: Db, o: { eventId: string; userId: string; name: unknown; phone: unknown; quantity: unknown; now: Date }): Promise<Reserved | Fail> {
  const ev = await db.event.findUnique({ where: { id: o.eventId } });
  if (!ev) return { ok: false, error: "Event not found." };
  const open = salesOpen({ ticketing: ev.ticketing, status: ev.status, eventDate: ev.eventDate, ticketsCloseAt: ev.ticketsCloseAt }, o.now);
  if (!open.open) return { ok: false, error: open.reason };
  if (!ev.ticketPrefix) return { ok: false, error: "Tickets for this event aren't set up yet." };
  const holding = await db.ticket.count({ where: { eventId: ev.id, userId: o.userId, status: { in: LIVE_STATUSES as never } } });
  const v = validateReservation({ quantity: o.quantity, name: o.name, phone: o.phone }, ev.ticketsPerPerson, holding);
  if (!v.ok) return v;

  try {
    return await db.$transaction(async (tx) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const cur = await tx.event.findUnique({ where: { id: ev.id }, select: { ticketSeq: true, ticketsTaken: true, ticketCapacity: true, ticketPrefix: true, ticketing: true, ticketPrice: true, ticketHoldHours: true } });
        if (!cur || !cur.ticketPrefix || cur.ticketing === "OFF") return { ok: false as const, error: "Tickets for this event aren't available." };
        if (cur.ticketCapacity !== null && cur.ticketsTaken + v.quantity > cur.ticketCapacity) {
          const left = Math.max(0, cur.ticketCapacity - cur.ticketsTaken);
          return { ok: false as const, error: left === 0 ? "Sorry — this event is sold out." : `Only ${left} ticket${left === 1 ? " is" : "s are"} left.` };
        }
        // The claim: take the numbers and the seats only if nobody changed the counters since we looked.
        const won = await tx.event.updateMany({ where: { id: ev.id, ticketSeq: cur.ticketSeq, ticketsTaken: cur.ticketsTaken }, data: { ticketSeq: cur.ticketSeq + v.quantity, ticketsTaken: cur.ticketsTaken + v.quantity } });
        if (won.count !== 1) continue;
        const groupId = newGroupId(); const paid = cur.ticketing === "PAID"; const tickets: Array<{ id: string; number: string; secret: string }> = [];
        for (let i = 1; i <= v.quantity; i++) {
          const secret = newTicketSecret();
          const t = await tx.ticket.create({ data: { eventId: ev.id, userId: o.userId, groupId, number: formatNumber(cur.ticketPrefix, cur.ticketSeq + i), secret, holderName: v.name, holderPhone: v.phone, status: paid ? "PENDING_PAYMENT" : "VALID", price: paid ? cur.ticketPrice : 0, expiresAt: paid ? holdExpiry(o.now, cur.ticketHoldHours) : null } });
          tickets.push({ id: t.id, number: t.number, secret });
        }
        return { ok: true as const, groupId, mode: cur.ticketing as TicketModeKey, tickets, event: { id: ev.id, name: ev.name } };
      }
      throw new Error("BUSY");
    });
  } catch (e) {
    if ((e as Error).message === "BUSY") return { ok: false, error: "That was busy — please try again." };
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------------------------- paying
/** The guest says which M-Pesa code they paid with. Not proof: it tells the organiser what to look for. */
export async function claimPayment(db: Db, o: { groupId: string; userId: string; code: unknown; now: Date }): Promise<{ ok: true; count: number } | Fail> {
  if (!claimOk(o.code)) return { ok: false, error: "Enter the confirmation code from your M-Pesa message (letters and numbers, 6–20 characters)." };
  const code = (o.code as string).trim().toUpperCase();
  const r = await db.ticket.updateMany({ where: { groupId: o.groupId, userId: o.userId, status: { in: ["PENDING_PAYMENT", "EXPIRED"] as never } }, data: { claimedReference: code, claimedAt: o.now } });
  return r.count > 0 ? { ok: true, count: r.count } : { ok: false, error: "There's nothing waiting for payment on these tickets (they may already be confirmed or cancelled)." };
}

export type Confirmed = { ok: true; count: number; revived: number; userId: string | null; holder: string; numbers: string[]; eventName: string } | Fail;

/** The organiser (or an admin) confirms the money arrived. One M-Pesa code can confirm only ONE reservation per event. */
export async function confirmPayment(db: Db, o: { eventId: string; groupId: string; reference: unknown; actorId: string; now: Date }): Promise<Confirmed> {
  if (!claimOk(o.reference)) return { ok: false, error: "Enter the M-Pesa confirmation code of the payment (letters and numbers, 6–20 characters)." };
  const ref = (o.reference as string).trim().toUpperCase();
  try {
    return await db.$transaction(async (tx): Promise<Confirmed> => {
      const group = await tx.ticket.findMany({ where: { groupId: o.groupId, eventId: o.eventId }, select: { id: true, number: true, status: true, userId: true, holderName: true } });
      if (group.length === 0) return { ok: false, error: "Those tickets weren't found." };
      const reused = await tx.ticket.findFirst({ where: { eventId: o.eventId, paymentReference: ref, groupId: { not: o.groupId } }, select: { number: true } });
      if (reused) return { ok: false, error: `That M-Pesa code was already used to confirm another reservation (${reused.number}). One payment can only cover one reservation — check the code.` };
      const eligible = group.filter((t) => t.status === "PENDING_PAYMENT" || t.status === "EXPIRED");
      if (eligible.length === 0) return { ok: false, error: "These tickets are already confirmed, used or cancelled — there's nothing to confirm." };
      const ev = await tx.event.findUnique({ where: { id: o.eventId }, select: { name: true } });
      // Pending ones still hold their seats. Expired ones gave theirs up, so they are only revived if the seats are still free.
      const expiredIds = eligible.filter((t) => t.status === "EXPIRED").map((t) => t.id);
      let revived = 0;
      if (expiredIds.length) {
        const claimedExpired = await tx.ticket.updateMany({ where: { id: { in: expiredIds }, status: "EXPIRED" }, data: { status: "VALID", paymentReference: ref, confirmedAt: o.now, confirmedById: o.actorId, expiresAt: null } });
        revived = claimedExpired.count;
        if (revived > 0 && !(await adjustTaken(tx, o.eventId, revived))) throw new Error("FULL");
      }
      const pending = await tx.ticket.updateMany({ where: { groupId: o.groupId, eventId: o.eventId, status: "PENDING_PAYMENT" }, data: { status: "VALID", paymentReference: ref, confirmedAt: o.now, confirmedById: o.actorId, expiresAt: null } });
      const total = pending.count + revived;
      if (total === 0) return { ok: false, error: "These tickets were just confirmed by someone else." };
      // The ledger row. Its unique keys (event + code, event + reservation) are enforced by the DATABASE, so two simultaneous confirmations — of
      // the same reservation, or of two reservations with one M-Pesa code — can't both succeed: the second insert fails and rolls everything back.
      await tx.ticketPayment.create({ data: { eventId: o.eventId, groupId: o.groupId, reference: ref, amount: eligible.length ? (await tx.ticket.findMany({ where: { groupId: o.groupId, eventId: o.eventId, status: "VALID", paymentReference: ref }, select: { price: true } })).reduce((n, x) => n + x.price, 0) : 0, confirmedById: o.actorId } });
      return { ok: true, count: total, revived, userId: group[0].userId, holder: group[0].holderName, numbers: group.map((t) => t.number), eventName: ev?.name ?? "" };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      const mine = await db.ticketPayment.findFirst({ where: { eventId: o.eventId, reference: ref }, select: { groupId: true } });
      if (mine && mine.groupId !== o.groupId) { const other = await db.ticket.findFirst({ where: { eventId: o.eventId, groupId: mine.groupId }, select: { number: true } }); return { ok: false, error: `That M-Pesa code was already used to confirm another reservation${other ? ` (${other.number})` : ""}. One payment can only cover one reservation — check the code.` }; }
      return { ok: false, error: "These tickets were just confirmed by someone else." };
    }
    if ((e as Error).message === "FULL") return { ok: false, error: "This reservation had expired and the event is now full, so it can't be revived. Please refund the guest." };
    if ((e as Error).message === "BUSY") return { ok: false, error: "That was busy — please try again." };
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------------------------- cancelling and expiring
export type Cancelled = { ok: true; count: number } | Fail;
/** Cancels the live tickets of a group (or one ticket) and gives their seats back. A USED ticket is never cancelled. */
export async function cancelTickets(db: Db, o: { eventId: string; groupId?: string; ticketId?: string; userId?: string; statuses?: string[]; by: "GUEST" | "ORGANISER" | "ADMIN" | "SYSTEM"; reason?: string; now: Date }): Promise<Cancelled> {
  if (!o.groupId && !o.ticketId) return { ok: false, error: "Nothing to cancel." };
  const statuses = o.statuses ?? ["PENDING_PAYMENT", "VALID"];
  return db.$transaction(async (tx): Promise<Cancelled> => {
    const r = await tx.ticket.updateMany({
      where: { eventId: o.eventId, status: { in: statuses as never }, ...(o.groupId ? { groupId: o.groupId } : {}), ...(o.ticketId ? { id: o.ticketId } : {}), ...(o.userId ? { userId: o.userId } : {}) },
      data: { status: "CANCELLED", cancelledAt: o.now, cancelledBy: o.by, cancelReason: (o.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || null, expiresAt: null },
    });
    if (r.count === 0) return { ok: false, error: "There was nothing to cancel (already cancelled, used or expired)." };
    await adjustTaken(tx, o.eventId, -r.count);
    return { ok: true, count: r.count };
  });
}

/** Releases paid reservations nobody confirmed in time. Safe to run often and from several places at once. */
export async function expireDue(db: Db, now: Date): Promise<{ expired: number }> {
  const due = await db.ticket.findMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lte: now } }, select: { id: true, eventId: true }, take: 1000 });
  let expired = 0;
  for (const t of due) {
    const done = await db.$transaction(async (tx) => {
      const r = await tx.ticket.updateMany({ where: { id: t.id, status: "PENDING_PAYMENT", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      if (r.count !== 1) return false;
      await adjustTaken(tx, t.eventId, -1);
      return true;
    });
    if (done) expired++;
  }
  return { expired };
}

// ---------------------------------------------------------------------------------------------------------------- the door
export type Admission =
  | { result: "ADMITTED"; number: string; holder: string }
  | { result: "ALREADY_USED"; number: string; holder: string; usedAt: Date | null }
  | { result: "NOT_PAID"; number: string; holder: string }
  | { result: "NOT_VALID"; number: string; holder: string; status: string }
  | { result: "WRONG_EVENT"; number: string; holder: string; otherEvent: string }
  | { result: "NOT_FOUND" };

/** Admits one person: VALID -> USED, exactly once. Looks the ticket up by the QR token (`secret`) or by its number at this event. */
export async function admit(db: Db, o: { eventId: string; secret?: string; number?: string; actorId: string; now: Date }): Promise<Admission> {
  const number = (o.number ?? "").trim().toUpperCase();
  const secret = (o.secret ?? "").trim();
  if (!secret && !number) return { result: "NOT_FOUND" };
  const t = secret ? await db.ticket.findUnique({ where: { secret }, include: { event: { select: { name: true } } } }) : await db.ticket.findFirst({ where: { eventId: o.eventId, number }, include: { event: { select: { name: true } } } });
  if (!t) return { result: "NOT_FOUND" };
  if (t.eventId !== o.eventId) return { result: "WRONG_EVENT", number: t.number, holder: t.holderName, otherEvent: t.event.name };
  const claimed = await db.ticket.updateMany({ where: { id: t.id, status: "VALID" }, data: { status: "USED", usedAt: o.now, usedById: o.actorId } });
  if (claimed.count === 1) return { result: "ADMITTED", number: t.number, holder: t.holderName };
  const now = await db.ticket.findUnique({ where: { id: t.id }, select: { status: true, usedAt: true } });
  if (now?.status === "USED") return { result: "ALREADY_USED", number: t.number, holder: t.holderName, usedAt: now.usedAt };
  if (now?.status === "PENDING_PAYMENT") return { result: "NOT_PAID", number: t.number, holder: t.holderName };
  return { result: "NOT_VALID", number: t.number, holder: t.holderName, status: now?.status ?? "UNKNOWN" };
}

// ---------------------------------------------------------------------------------------------------------------- reading
export type GroupRow = { groupId: string; holder: string; phone: string; userId: string | null; numbers: string[]; count: number; amount: number; status: string; counts: Record<string, number>; claimedReference: string | null; claimedAt: Date | null; paymentReference: string | null; createdAt: Date; expiresAt: Date | null };

/** The attendee list for an event, one row per reservation (a group of tickets bought together). */
export async function eventGroups(db: Db, eventId: string): Promise<GroupRow[]> {
  const rows = await db.ticket.findMany({ where: { eventId }, orderBy: { createdAt: "asc" }, take: 5000 });
  const map = new Map<string, GroupRow>();
  for (const t of rows) {
    const g = map.get(t.groupId) ?? { groupId: t.groupId, holder: t.holderName, phone: t.holderPhone, userId: t.userId, numbers: [], count: 0, amount: 0, status: "", counts: {}, claimedReference: null, claimedAt: null, paymentReference: null, createdAt: t.createdAt, expiresAt: null };
    g.numbers.push(t.number); g.count++; g.amount += t.price; g.counts[t.status] = (g.counts[t.status] ?? 0) + 1;
    g.claimedReference = g.claimedReference ?? t.claimedReference; g.claimedAt = g.claimedAt ?? t.claimedAt; g.paymentReference = g.paymentReference ?? t.paymentReference; g.expiresAt = g.expiresAt ?? t.expiresAt;
    map.set(t.groupId, g);
  }
  for (const g of map.values()) g.status = ["PENDING_PAYMENT", "VALID", "USED", "EXPIRED", "CANCELLED"].find((s) => g.counts[s]) ?? "CANCELLED";
  return [...map.values()];
}
