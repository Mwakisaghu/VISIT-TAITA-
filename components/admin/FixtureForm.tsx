import type { SportFixture, SportTeam, SportVenue } from "@prisma/client";
import { saveFixture } from "@/lib/actions/cup";

const statuses = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"];

function toLocalInputValue(date?: Date) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function FixtureForm({
  fixture,
  teams,
  venues,
}: {
  fixture?: SportFixture;
  teams: SportTeam[];
  venues: SportVenue[];
}) {
  const action = saveFixture.bind(null, fixture?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Home team">
          <select name="homeTeamId" defaultValue={fixture?.homeTeamId ?? teams[0]?.id} required className="input">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Away team">
          <select name="awayTeamId" defaultValue={fixture?.awayTeamId ?? teams[1]?.id} required className="input">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Venue">
        <select name="venueId" defaultValue={fixture?.venueId ?? venues[0]?.id} required className="input">
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kickoff">
        <input
          name="kickoff"
          type="datetime-local"
          defaultValue={toLocalInputValue(fixture?.kickoff)}
          required
          className="input"
        />
      </Field>

      <Field label="Round (optional)">
        <input name="round" defaultValue={fixture?.round ?? ""} className="input" placeholder="Matchday 1" />
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={fixture?.status ?? "SCHEDULED"} className="input">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Home score (if finished)">
          <input name="homeScore" type="number" min={0} defaultValue={fixture?.homeScore ?? ""} className="input" />
        </Field>
        <Field label="Away score (if finished)">
          <input name="awayScore" type="number" min={0} defaultValue={fixture?.awayScore ?? ""} className="input" />
        </Field>
      </div>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {fixture ? "Save changes" : "Create fixture"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/70">{label}</span>
      {children}
    </label>
  );
}
