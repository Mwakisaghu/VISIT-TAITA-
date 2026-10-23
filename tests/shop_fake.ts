// A small in-memory stand-in for Prisma, for the shop payment tests.
//  - every operation yields to the event loop first, so concurrent callers genuinely interleave;
//  - the match-and-change of updateMany/update is synchronous after that yield (like a row-level atomic update);
//  - $transaction rolls every write back if the callback throws, but concurrent transactions OVERLAP (no serialising), like READ COMMITTED.
export const T: Record<string, any[]> = { user: [], product: [], order: [], orderItem: [], orderRefund: [], adminAuditLog: [] };
export const hooks: { throwOn?: (table: string, op: string, args: any) => void } = {};
let counter = 0; export const nid = (p: string) => `${p}${++counter}`;
export const resetDb = () => { for (const k of Object.keys(T)) T[k] = []; };
const REL: any = {
  order: { items: { t: "orderItem", by: "orderId", many: true }, refunds: { t: "orderRefund", by: "orderId", many: true }, buyer: { t: "user", fk: "buyerId" } },
  orderRefund: { order: { t: "order", fk: "orderId" } },
  orderItem: { product: { t: "product", fk: "productId" } },
};
const tick = () => new Promise((r) => setImmediate(r));
const isObj = (v: any) => v && typeof v === "object" && !(v instanceof Date);
function match(row: any, where: any = {}): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (isObj(v)) {
      const c: any = v;
      if ("in" in c) { if (!c.in.includes(row[k])) return false; continue; }
      if ("gte" in c) { if (!(row[k] >= c.gte)) return false; continue; }
      if ("gt" in c) { if (!(row[k] > c.gt)) return false; continue; }
      if ("not" in c) { if (row[k] === c.not) return false; continue; }
      return false; // an operator we don't model (e.g. an injected { $ne: "" }) matches nothing
    }
    if (v === null) { if (row[k] != null) return false; continue; } // null matches an empty OR a missing field, as in the database
    if (row[k] !== v) return false;
  }
  return true;
}
function shape(table: string, row: any, args: any = {}): any {
  if (!row) return null;
  const rel = (name: string, a: any) => { const r = REL[table]?.[name]; if (!r) return undefined; const sub = a === true ? {} : a; if (r.many) return T[r.t].filter((x) => x[r.by] === row.id).map((x) => shape(r.t, x, sub)); return shape(r.t, T[r.t].find((x) => x.id === row[r.fk]), sub); };
  if (args.select) { const out: any = {}; for (const [k, v] of Object.entries(args.select)) { if (!v) continue; out[k] = REL[table]?.[k] ? rel(k, v) : row[k]; } return out; }
  const out = { ...row }; if (args.include) for (const [k, v] of Object.entries(args.include)) out[k] = rel(k, v); return out;
}
function applyData(table: string, row: any, data: any) {
  for (const [k, v] of Object.entries(data)) {
    if (isObj(v) && ("increment" in (v as any) || "decrement" in (v as any))) row[k] = (row[k] ?? 0) + ((v as any).increment ?? 0) - ((v as any).decrement ?? 0);
    else row[k] = v;
  }
  if ("updatedAt" in row) row.updatedAt = new Date();
}
const defaults: any = { order: () => ({ status: "PENDING", paymentStatus: "UNPAID", paymentMethod: "NONE", paymentFailureReason: null, paidAt: null, mpesaCheckoutRequestId: null, mpesaMerchantRequestId: null, mpesaReceiptNumber: null, pesapalOrderTrackingId: null, pesapalMerchantReference: null, pesapalConfirmationCode: null, createdAt: new Date(), updatedAt: new Date(), phone: "254712345678", stockReleasedAt: null, cancelledAt: null, cancelReason: null, cancelledById: null }), orderRefund: () => ({ status: "PENDING", reference: null, note: null, destination: null, paymentReference: null, createdAt: new Date(), createdById: null, processedAt: null, processedById: null }), adminAuditLog: () => ({ createdAt: new Date(), targetUserId: null, targetEmail: null, detail: null }) };
type Undo = Array<() => void>;
function delegates(undo?: Undo) {
  const out: any = {};
  for (const table of Object.keys(T)) {
    const guard = async (op: string, args: any) => { await tick(); hooks.throwOn?.(table, op, args); };
    const touch = (row: any) => { if (undo) { const before = { ...row }; undo.push(() => { for (const k of Object.keys(row)) delete row[k]; Object.assign(row, before); }); } };
    const find = (where: any) => T[table].find((r) => match(r, where));
    out[table] = {
      create: async (a: any) => { await guard("create", a); const row = { id: a.data.id ?? nid(table.slice(0, 2)), ...(defaults[table]?.() ?? {}), ...a.data }; T[table].push(row); undo?.push(() => { T[table] = T[table].filter((x) => x !== row); }); return shape(table, row, a); },
      findUnique: async (a: any) => { await guard("findUnique", a); return shape(table, find(a.where), a); },
      findFirst: async (a: any = {}) => { await guard("findFirst", a); return shape(table, find(a.where), a); },
      findMany: async (a: any = {}) => { await guard("findMany", a); return T[table].filter((r) => match(r, a.where)).map((r) => shape(table, r, a)); },
      count: async (a: any = {}) => { await guard("count", a); return T[table].filter((r) => match(r, a.where)).length; },
      update: async (a: any) => { await guard("update", a); const row = find(a.where); if (!row) throw new Error(`${table} not found`); touch(row); applyData(table, row, a.data); return shape(table, row, a); },
      updateMany: async (a: any) => { await guard("updateMany", a); const rows = T[table].filter((r) => match(r, a.where)); for (const r of rows) { touch(r); applyData(table, r, a.data); } return { count: rows.length }; },
    };
  }
  return out;
}
let chain: Promise<any> = Promise.resolve();
export function makeDb() {
  const db: any = delegates();
  db.$transaction = (fn: (tx: any) => Promise<any>) => {
    const run = async () => { const undo: Undo = []; try { return await fn(delegates(undo)); } catch (e) { for (const u of undo.reverse()) u(); throw e; } };
    return run(); // transactions OVERLAP, as in Postgres at READ COMMITTED: "check, then act" inside one is NOT safe — only an atomic claim is
  };
  return db;
}
export const addUser = (o: any = {}) => { const u = { id: nid("us"), name: "Test User", email: `${nid("e")}@x.co`, role: "MEMBER", ...o }; T.user.push(u); return u; };
