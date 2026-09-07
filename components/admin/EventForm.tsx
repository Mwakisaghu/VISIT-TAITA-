import type { Event } from "@prisma/client";
import { saveEvent } from "@/lib/actions/admin";

const programs = ["TAITA_CUP", "TAITA_WEEK", "TAITA_SOUND"];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/70">{label}</span>
      {children}
    </label>
  );
}
