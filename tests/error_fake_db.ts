// An in-memory stand-in for the error log's two tables that behaves like the real database where it matters: unique fingerprints (a duplicate throws the same P2002 error), `increment`, cascade delete of
// occurrences with their issue, and the filters the admin page uses (AND, OR, equality, gte/lt, contains + insensitive, and "events some digest"). Shared by the error log tests.
export type Row = Record<string, any>;
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v);

export function fakeErrorDb(opts: { failWith?: () => Error | null; raceOnce?: boolean } = {}) {
  const issues: Row[] = []; const events: Row[] = []; const audits: Row[] = []; let seq = 0; let raced = false; const calls: string[] = [];
  const id = () => `id${String(++seq).padStart(6, "0")}xyz`;
  const fail = (op: string) => { calls.push(op); const e = opts.failWith?.(); if (e) throw e; };
  const test = (row: Row, where: Row | undefined): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]) => {
      if (k === "AND") return (v as Row[]).every((w) => test(row, w));
      if (k === "OR") return (v as Row[]).some((w) => test(row, w));
      if (k === "events") return events.some((e) => e.issueId === row.id && test(e, (v as Row).some));
      const x = row[k];
      if (isObj(v)) {
        if ("gte" in v) return x >= v.gte; if ("lt" in v) return x < v.lt; if ("in" in v) return v.in.includes(x);
        if ("contains" in v) return typeof x === "string" && (v.mode === "insensitive" ? x.toLowerCase().includes(String(v.contains).toLowerCase()) : x.includes(v.contains));
        return false;
      }
      return x === v;
    });
  };
  const apply = (row: Row, data: Row) => { for (const [k, v] of Object.entries(data)) row[k] = isObj(v) && "increment" in v ? (row[k] ?? 0) + v.increment : v; };
  const order = (rows: Row[], orderBy?: Row[] | Row) => { const o = (Array.isArray(orderBy) ? orderBy[0] : orderBy) ?? {}; const [k, dir] = Object.entries(o)[0] ?? []; return k ? [...rows].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (dir === "desc" ? -1 : 1)) : rows; };
  const pick = (row: Row | undefined, select?: Row) => (row && select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : row);
  const errorIssue = {
    findUnique: async (a: Row) => { fail("issue.findUnique"); const r = issues.find((i) => Object.entries(a.where).every(([k, v]) => i[k] === v)); if (!r) return null; if (a.include?.events) return { ...r, events: order(events.filter((e) => e.issueId === r.id), a.include.events.orderBy).slice(0, a.include.events.take ?? 1e9) }; return pick(r, a.select); },
    create: async (a: Row) => { fail("issue.create"); if (opts.raceOnce && !raced) { raced = true; issues.push({ id: id(), count: 1, regressions: 0, status: "OPEN", resolvedAt: null, resolvedBy: null, note: null, lastDigest: null, ...a.data, firstSeen: a.data.firstSeen, lastSeen: a.data.lastSeen }); const e: any = new Error("Unique constraint failed"); e.code = "P2002"; throw e; } if (issues.some((i) => i.fingerprint === a.data.fingerprint)) { const e: any = new Error("Unique constraint failed"); e.code = "P2002"; throw e; } const r = { id: id(), count: 1, regressions: 0, status: "OPEN", resolvedAt: null, resolvedBy: null, note: null, lastDigest: null, firstSeen: new Date(), lastSeen: new Date(), ...a.data }; issues.push(r); return pick(r, a.select); },
    update: async (a: Row) => { fail("issue.update"); const r = issues.find((i) => i.id === a.where.id); if (!r) throw new Error("not found"); apply(r, a.data); return r; },
    delete: async (a: Row) => { fail("issue.delete"); const n = issues.findIndex((i) => i.id === a.where.id); if (n < 0) throw new Error("not found"); issues.splice(n, 1); for (let k = events.length - 1; k >= 0; k--) if (events[k].issueId === a.where.id) events.splice(k, 1); return {}; },
    deleteMany: async (a: Row) => { fail("issue.deleteMany"); const gone = issues.filter((i) => test(i, a.where)); for (const g of gone) { issues.splice(issues.indexOf(g), 1); for (let k = events.length - 1; k >= 0; k--) if (events[k].issueId === g.id) events.splice(k, 1); } return { count: gone.length }; },
    count: async (a: Row = {}) => { fail("issue.count"); return issues.filter((i) => test(i, a.where)).length; },
    findMany: async (a: Row = {}) => { fail("issue.findMany"); const rows = order(issues.filter((i) => test(i, a.where)), a.orderBy); return rows.slice(a.skip ?? 0, (a.skip ?? 0) + (a.take ?? 1e9)); },
    groupBy: async () => { fail("issue.groupBy"); const m = new Map<string, number>(); for (const i of issues) m.set(i.status, (m.get(i.status) ?? 0) + 1); return [...m].map(([status, n]) => ({ status, _count: { _all: n } })); },
  };
  const errorEvent = {
    count: async (a: Row = {}) => { fail("event.count"); return events.filter((e) => test(e, a.where)).length; },
    findFirst: async (a: Row) => { fail("event.findFirst"); return pick(order(events.filter((e) => test(e, a.where)), a.orderBy)[0], a.select) ?? null; },
    create: async (a: Row) => { fail("event.create"); const r = { id: id(), createdAt: new Date(), method: null, stack: null, extra: null, digest: null, browser: null, signedIn: false, release: null, locale: null, ...a.data }; events.push(r); return r; },
    delete: async (a: Row) => { fail("event.delete"); const n = events.findIndex((e) => e.id === a.where.id); if (n >= 0) events.splice(n, 1); return {}; },
    deleteMany: async (a: Row) => { fail("event.deleteMany"); const gone = events.filter((e) => test(e, a.where)); for (const g of gone) events.splice(events.indexOf(g), 1); return { count: gone.length }; },
  };
  const adminAuditLog = { create: async (a: Row) => { audits.push(a.data); return a.data; } };
  return { db: { errorIssue, errorEvent, adminAuditLog } as any, issues, events, audits, calls };
}
