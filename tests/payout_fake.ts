// A small in-memory stand-in for Prisma for the payout tests. Operations yield to the event loop first (so concurrent callers interleave);
// the match-and-change inside updateMany is synchronous afterwards (a row-level atomic update); $transaction rolls back if it throws, but
// transactions OVERLAP like READ COMMITTED — "check, then act" is NOT safe, only an atomic claim is.
export const T: Record<string, any[]> = { user: [], experience: [], experienceSession: [], booking: [], hostPayout: [], payoutSettings: [], adminAuditLog: [] };
export const hooks: { throwOn?: (table: string, op: string, args: any) => void } = {};
let counter = 0; export const nid = (p: string) => `${p}${++counter}`;
export const resetDb = () => { for (const k of Object.keys(T)) T[k] = []; };
const REL: any = {
  booking: { session: { t: "experienceSession", fk: "sessionId" }, experience: { t: "experience", fk: "experienceId" }, payout: { t: "hostPayout", fk: "payoutId" } },
  hostPayout: { bookings: { t: "booking", by: "payoutId", many: true }, host: { t: "user", fk: "hostId" } },
};
const tick = () => new Promise((r) => setImmediate(r));
const isObj = (v: any) => v && typeof v === "object" && !(v instanceof Date);
function match(table: string, row: any, where: any = {}): boolean {
  for (const [k, v] of Object.entries<any>(where)) {
    if (v === undefined) continue;
    const rel = REL[table]?.[k];
    if (rel) { const target = T[rel.t].find((x) => x.id === row[rel.fk]); if (!target || !match(rel.t, target, v)) return false; continue; }
    if (isObj(v)) {
      if ("in" in v) { if (!v.in.includes(row[k])) return false; continue; }
      if ("gte" in v) { if (!(row[k] >= v.gte)) return false; continue; }
      if ("gt" in v) { if (!(row[k] > v.gt)) return false; continue; }
      if ("not" in v) { if (v.not === null ? row[k] == null : row[k] === v.not) return false; continue; }
      return false;
    }
    if ((row[k] ?? null) !== v) return false;
  }
  return true;
}
function shape(table: string, row: any, args: any = {}): any {
  if (!row) return null;
  const rel = (name: string, a: any) => { const r = REL[table]?.[name]; if (!r) return undefined; const sub = a === true ? {} : a; if (r.many) return T[r.t].filter((x) => x[r.by] === row.id).map((x) => shape(r.t, x, sub)); return shape(r.t, T[r.t].find((x) => x.id === row[r.fk]), sub); };
  if (args.select) { const out: any = {}; for (const [k, v] of Object.entries(args.select)) { if (!v) continue; out[k] = REL[table]?.[k] ? rel(k, v) : row[k]; } return out; }
  const out = { ...row }; if (args.include) for (const [k, v] of Object.entries(args.include)) out[k] = rel(k, v); return out;
}
const num = (v: any) => (v instanceof Date ? v.getTime() : v);
const sortRows = (rows: any[], orderBy: any) => { const o = Array.isArray(orderBy) ? orderBy[0] : orderBy; if (!o) return rows; const [[f, d]] = Object.entries<any>(o); if (typeof d !== "string") return rows; return rows.sort((a, b) => (num(a[f]) > num(b[f]) ? 1 : num(a[f]) < num(b[f]) ? -1 : 0) * (d === "desc" ? -1 : 1)); };
const DEFAULTS: any = {
  booking: () => ({ payoutId: null, completedAt: null, cancelledAt: null, paidAmount: 0, refundedAmount: 0, guests: 2, createdAt: new Date() }),
  hostPayout: () => ({ status: "PENDING", reference: null, note: null, createdAt: new Date(), processedAt: null, processedById: null }),
  user: () => ({ role: "MEMBER", payoutPhone: null, suspendedAt: null, emailVerifiedAt: new Date() }),
};
type Undo = Array<() => void>;
function delegates(undo?: Undo) {
  const out: any = {};
  for (const table of Object.keys(T)) {
    const guard = async (op: string, args: any) => { await tick(); hooks.throwOn?.(table, op, args); };
    const touch = (row: any) => { if (undo) { const before = { ...row }; undo.push(() => { for (const k of Object.keys(row)) delete row[k]; Object.assign(row, before); }); } };
    const find = (where: any) => T[table].find((r) => match(table, r, where));
    const apply = (row: any, data: any) => { Object.assign(row, data); if ("updatedAt" in row) row.updatedAt = new Date(); };
    const create = async (a: any) => { const row = { id: a.data.id ?? nid(table.slice(0, 2)), ...(DEFAULTS[table]?.() ?? {}), ...a.data }; T[table].push(row); undo?.push(() => { T[table] = T[table].filter((x) => x !== row); }); return row; };
    out[table] = {
      create: async (a: any) => { await guard("create", a); return shape(table, await create(a), a); },
      findUnique: async (a: any) => { await guard("findUnique", a); return shape(table, find(a.where), a); },
      findUniqueOrThrow: async (a: any) => { await guard("findUnique", a); const r = find(a.where); if (!r) throw new Error(`${table} not found`); return shape(table, r, a); },
      findFirst: async (a: any = {}) => { await guard("findFirst", a); return shape(table, sortRows(T[table].filter((r) => match(table, r, a.where)), a.orderBy)[0], a); },
      findMany: async (a: any = {}) => { await guard("findMany", a); let rows = sortRows(T[table].filter((r) => match(table, r, a.where)), a.orderBy); if (a.skip) rows = rows.slice(a.skip); if (a.take) rows = rows.slice(0, a.take); return rows.map((r) => shape(table, r, a)); },
      count: async (a: any = {}) => { await guard("count", a); return T[table].filter((r) => match(table, r, a.where)).length; },
      update: async (a: any) => { await guard("update", a); const row = find(a.where); if (!row) throw new Error(`${table} not found`); touch(row); apply(row, a.data); return shape(table, row, a); },
      updateMany: async (a: any) => { await guard("updateMany", a); const rows = T[table].filter((r) => match(table, r, a.where)); for (const r of rows) { touch(r); apply(r, a.data); } return { count: rows.length }; },
      upsert: async (a: any) => { await guard("upsert", a); const row = find(a.where); if (row) { touch(row); apply(row, a.update); return shape(table, row, a); } return shape(table, await create({ data: a.create }), a); },
      delete: async (a: any) => { await guard("delete", a); const row = find(a.where); if (!row) throw new Error(`${table} not found`); T[table] = T[table].filter((x) => x !== row); undo?.push(() => { T[table].push(row); }); return shape(table, row, a); },
    };
  }
  return out;
}
export function makeDb() { const db: any = delegates(); db.$transaction = async (fn: (tx: any) => Promise<any>) => { const undo: Undo = []; try { return await fn(delegates(undo)); } catch (e) { for (const u of undo.reverse()) u(); throw e; } }; return db; }
export const addUser = (o: any = {}) => { const u = { id: nid("us"), name: "Test User", email: `${nid("e")}@x.co`, ...DEFAULTS.user(), ...o }; T.user.push(u); return u; };
