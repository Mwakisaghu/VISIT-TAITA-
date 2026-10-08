import { LEVELS, LEVEL_LABEL, MOODS, MAX_ALTITUDE_M } from "@/lib/field-guide";

type Defaults = { altitudeM?: number | null; difficulty?: string | null; elevationGainM?: number | null; hostName?: string | null; hostRole?: string | null; hostQuote?: string | null; moods?: string[] | null };

const label = "flex flex-col gap-1";
const hint = "font-body text-sm text-stone/70";

/** The "Field guide" part of a listing form: how high it is, how hard, and who a visitor will meet. Every field is optional. */
export default function GuideFields({ kind, defaults }: { kind: "experience" | "stay" | "place"; defaults?: Defaults | null }) {
  const d = defaults ?? {};
  return (
    <fieldset className="flex flex-col gap-5 rounded-[2px] border border-stone/20 p-5">
      <legend className="px-2 font-body text-sm font-semibold text-stone">Field guide (optional)</legend>
      <p className={hint}>
        These facts appear on cards and pages: how high it is{kind === "experience" ? ", how hard it is" : ""}
        {kind !== "place" ? ", and who a visitor will meet" : ""}. Leave anything you don&apos;t know empty.
      </p>
      <label className={label}>
        <span className={hint}>Altitude in metres above sea level</span>
        <input name="altitudeM" inputMode="numeric" defaultValue={d.altitudeM ?? ""} placeholder={`e.g. 1420 (0 to ${MAX_ALTITUDE_M.toLocaleString("en")})`} className="input" />
      </label>
      {kind === "experience" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            <span className={hint}>How hard is it?</span>
            <select name="difficulty" defaultValue={d.difficulty ?? ""} className="input">
              <option value="">Not stated</option>
              {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </label>
          <label className={label}>
            <span className={hint}>Total climb in metres</span>
            <input name="elevationGainM" inputMode="numeric" defaultValue={d.elevationGainM ?? ""} placeholder="e.g. 350" className="input" />
          </label>
        </div>
      )}
      {kind !== "place" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              <span className={hint}>{kind === "experience" ? "Guide's name" : "Host's name"}</span>
              <input name="hostName" maxLength={80} defaultValue={d.hostName ?? ""} className="input" />
            </label>
            <label className={label}>
              <span className={hint}>Their role</span>
              <input name="hostRole" maxLength={40} defaultValue={d.hostRole ?? ""} placeholder={kind === "experience" ? "Guide" : "Host"} className="input" />
            </label>
          </div>
          <label className={label}>
            <span className={hint}>A line in their own words (optional)</span>
            <textarea name="hostQuote" rows={2} maxLength={240} defaultValue={d.hostQuote ?? ""} className="input" />
          </label>
          <p className={hint}>Only name someone who has agreed to be named.</p>
        </>
      )}
      {kind === "stay" && (
        <fieldset className="flex flex-col gap-2">
          <legend className={hint}>How does it feel?</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {MOODS.map((m) => (
              <label key={m.key} className="flex items-center gap-2 font-body text-sm text-stone">
                <input type="checkbox" name="moods" value={m.key} defaultChecked={!!d.moods?.includes(m.key)} /> {m.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </fieldset>
  );
}
