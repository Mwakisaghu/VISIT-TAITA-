// Who may manage which accounts, and how. Pure rules — the server actions call these, and the tests exercise every one.

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as const;
/** Who may use Admin -> Users at all. */
export const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
/** Roles that can be given or taken away on the Users screen. Partner, seller and creator are earned through their own approval flows. */
export const ASSIGNABLE_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER", "MEMBER"] as const;
/** Roles a new staff account can be invited with. */
export const INVITABLE_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as const;
/** Roles that belong to an approval flow, so they can't be changed here. (EVENT_MANAGER exists in the database but grants no access anywhere.) */
export const ROLES_MANAGED_ELSEWHERE = ["PARTNER", "SELLER", "CREATOR", "EVENT_MANAGER"] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin", ADMIN: "Admin", EDITOR: "Editor", CONTENT_MANAGER: "Content manager",
  PARTNER: "Partner (host)", SELLER: "Seller", CREATOR: "Field Crew creator", MEMBER: "Member", VISITOR: "Visitor", EVENT_MANAGER: "Event manager (no access)",
};
export const ROLE_HELP: Record<string, string> = {
  SUPER_ADMIN: "Everything, including creating and changing admins. Keep this to one or two trusted people.",
  ADMIN: "Everything in the admin area, and can manage editors, content managers and members — but not other admins.",
  EDITOR: "Can use the admin area to manage content. Can't manage people.",
  CONTENT_MANAGER: "Can use the admin area to manage content. Can't manage people.",
  MEMBER: "An ordinary signed-in account with no admin access.",
};

export const roleLabel = (r: string) => ROLE_LABELS[r] ?? r;
export const isManager = (role: unknown): boolean => typeof role === "string" && (MANAGER_ROLES as readonly string[]).includes(role);
export const isStaff = (role: unknown): boolean => typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role);

export const rolesAssignableBy = (actorRole: string): string[] => (actorRole === "SUPER_ADMIN" ? [...ASSIGNABLE_ROLES] : actorRole === "ADMIN" ? ["EDITOR", "CONTENT_MANAGER", "MEMBER"] : []);
export const rolesInvitableBy = (actorRole: string): string[] => (actorRole === "SUPER_ADMIN" ? [...INVITABLE_ROLES] : actorRole === "ADMIN" ? ["EDITOR", "CONTENT_MANAGER"] : []);

export type Actor = { id: string; role: string };
export type Target = { id: string; role: string; emailVerifiedAt?: Date | null; suspendedAt?: Date | null };
export type Verdict = { ok: true } | { ok: false; error: string };
const no = (error: string): Verdict => ({ ok: false, error });
const yes: Verdict = { ok: true };

/** The checks every action on someone else's account starts with. */
export function checkActOn(actor: Actor, target: Target): Verdict {
  if (!isManager(actor.role)) return no("Admin access required.");
  if (actor.id === target.id) return no("You can't change your own account here — ask another admin.");
  if (actor.role === "ADMIN" && (target.role === "ADMIN" || target.role === "SUPER_ADMIN")) return no("Only a super admin can change an admin or super admin account.");
  return yes;
}

/** Active super admins left if this target stopped being one. */
const superAdminsLeft = (target: Target, activeSuperAdmins: number) => activeSuperAdmins - (target.role === "SUPER_ADMIN" && !target.suspendedAt ? 1 : 0);

export function checkRoleChange(a: { actor: Actor; target: Target; newRole: string; activeSuperAdmins: number }): Verdict {
  const base = checkActOn(a.actor, a.target);
  if (!base.ok) return base;
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(a.newRole)) return no("That role can't be assigned here.");
  if (!rolesAssignableBy(a.actor.role).includes(a.newRole)) return no("Only a super admin can make someone an admin or super admin.");
  if (a.target.role === a.newRole) return no("They already have that role.");
  if ((ROLES_MANAGED_ELSEWHERE as readonly string[]).includes(a.target.role)) {
    return no("Partner, seller and creator accounts are managed through their own approval screens, so their role can't be changed here. To give this person staff access, invite a separate staff account for them.");
  }
  if ((INVITABLE_ROLES as readonly string[]).includes(a.newRole) && !a.target.emailVerifiedAt) {
    return no("Their email address isn't verified yet, so they can't be given staff access. Send them a verification link first.");
  }
  if (a.target.role === "SUPER_ADMIN" && a.newRole !== "SUPER_ADMIN" && superAdminsLeft(a.target, a.activeSuperAdmins) < 1) return no("There must always be at least one active super admin.");
  return yes;
}

export function checkSuspend(a: { actor: Actor; target: Target; activeSuperAdmins: number }): Verdict {
  const base = checkActOn(a.actor, a.target);
  if (!base.ok) return base;
  if (a.target.suspendedAt) return no("This account is already suspended.");
  if (a.target.role === "SUPER_ADMIN" && superAdminsLeft(a.target, a.activeSuperAdmins) < 1) return no("There must always be at least one active super admin.");
  return yes;
}

export function checkReinstate(a: { actor: Actor; target: Target }): Verdict {
  const base = checkActOn(a.actor, a.target);
  if (!base.ok) return base;
  return a.target.suspendedAt ? yes : no("This account isn't suspended.");
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normaliseEmail = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL_PATTERN.test(e) ? e : null;
};

export function validateInvite(a: { actor: Actor; name: unknown; email: unknown; role: unknown }): { ok: true; name: string; email: string; role: string } | { ok: false; error: string } {
  if (!isManager(a.actor.role)) return no("Admin access required.") as never;
  const name = typeof a.name === "string" ? a.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter the person's name (2–80 characters)." };
  const email = normaliseEmail(a.email);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  const role = typeof a.role === "string" ? a.role : "";
  if (!rolesInvitableBy(a.actor.role).includes(role)) {
    return { ok: false, error: (INVITABLE_ROLES as readonly string[]).includes(role) ? "Only a super admin can invite an admin or super admin." : "Choose a staff role." };
  }
  return { ok: true, name, email, role };
}

export type StatusFields = { suspendedAt?: Date | null; emailVerifiedAt?: Date | null; passwordChangedAt?: Date | null; invitedAt?: Date | null; role: string };
/** Someone an administrator invited who hasn't yet chosen a password. (Recorded explicitly: guessing from missing fields mislabels seeded accounts.) */
export const isPendingInvite = (u: StatusFields) => !!u.invitedAt && !u.emailVerifiedAt && !u.passwordChangedAt;
export function accountStatus(u: StatusFields): "Suspended" | "Invite pending" | "Email not verified" | "Active" {
  if (u.suspendedAt) return "Suspended";
  if (isPendingInvite(u)) return "Invite pending";
  if (!u.emailVerifiedAt) return "Email not verified";
  return "Active";
}

export const AUDIT_LABELS: Record<string, string> = {
  "user.invite": "Invited as staff", "user.role": "Changed role", "user.suspend": "Suspended", "user.reinstate": "Reinstated",
  "user.signout": "Signed out everywhere", "user.reset_link": "Sent a password link", "user.verify_link": "Sent a verification link",
};

// ---------- the list screen ----------
export const USER_PAGE_SIZE = 25;
export type UserListQuery = { q: string; role: string; status: string; page: number };
const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER", "PARTNER", "SELLER", "CREATOR", "MEMBER", "VISITOR"];

export function parseUserListQuery(sp: Record<string, string | string[] | undefined>): UserListQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const q = one("q").replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const role = ALL_ROLES.includes(one("role")) ? one("role") : "";
  const status = ["suspended", "unverified", "pending"].includes(one("status")) ? one("status") : "";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(one("page"))) || 1));
  return { q, role, status, page };
}

export function buildUserWhere(q: UserListQuery): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];
  if (q.q) and.push({ OR: [{ name: { contains: q.q, mode: "insensitive" } }, { email: { contains: q.q, mode: "insensitive" } }] });
  if (q.role) and.push({ role: q.role });
  if (q.status === "suspended") and.push({ suspendedAt: { not: null } });
  if (q.status === "unverified") and.push({ emailVerifiedAt: null, suspendedAt: null });
  if (q.status === "pending") and.push({ invitedAt: { not: null }, emailVerifiedAt: null, passwordChangedAt: null, suspendedAt: null });
  return and.length ? { AND: and } : {};
}
