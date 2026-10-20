import type { Event } from "@prisma/client";
import { saveEvent } from "@/lib/actions/admin";
import { DETAIL_MAX, type DetailField } from "@/lib/event-details";

const programs = ["TAITA_CUP", "TAITA_WEEK", "TAITA_SOUND"];
const MORE: Array<[DetailField, string, string, number]> = [
  ["details", "About this event", "The longer description. Leave a blank line between paragraphs.", 5],
  ["programme", "Programme", "One item per line. Start with a time and a bar, for example: 08:00 | Gates open", 5],
  ["included", "What's included", "One item per line.", 3],
  ["bring", "What to bring", "One item per line.", 3],
  ["gettingThere", "Getting there", "Directions, parking and public transport.", 4],
  ["accessibility", "Age and accessibility", "Age limits, and whether the ground is step-free.", 3],
  ["contact", "Contact the organiser", "A phone number, WhatsApp or email, one per line.", 2],
];

export default function EventForm({ event }: { event?: Event }) {
  const action = saveEvent.bind(null, event?.id ?? null);
  const defaultDate = event ? event.eventDate.toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={event?.name} required className="input" />
      </Field>

      <Field label="Program">
        <select name="program" defaultValue={event?.program ?? "TAITA_CUP"} className="input">
          {programs.map((p) => (
            <option key={p} value={p}>
              {p.replace("_", " ")}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date">
        <input name="eventDate" type="date" defaultValue={defaultDate} required className="input" />
      </Field>

      <Field label="Location">
        <input name="location" defaultValue={event?.location} required className="input" />
      </Field>

      <Field label="Description">
        <textarea name="blurb" defaultValue={event?.blurb} required rows={3} className="input" />
      </Field>

      <fieldset className="mt-2 grid gap-5 border-t border-stone/20 pt-6">
        <legend className="mb-1 font-display text-lg text-stone">More details (optional)</legend>
        <p className="font-body text-sm text-stone/80">These appear under &ldquo;Show more details&rdquo; on the event page. Fill in only what you know: parts you leave empty are not shown, and the whole section is hidden if everything is empty.</p>
        {MORE.map(([name, label, hint, rows]) => (
          <Field key={name} label={label} hint={hint}>
            <textarea name={name} defaultValue={event?.[name] ?? ""} rows={rows} maxLength={DETAIL_MAX[name]} className="input" />
          </Field>
        ))}
      </fieldset>

      <Field label="Status">
        <select name="status" defaultValue={event?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {event ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/80">{label}</span>
      {hint && <span className="font-body text-xs text-stone/80">{hint}</span>}
      {children}
    </label>
  );
}
