import type { FestivalVenue } from "@prisma/client";
import { saveFestivalVenue } from "@/lib/actions/festival";

export default function FestivalVenueForm({ venue }: { venue?: FestivalVenue }) {
  const action = saveFestivalVenue.bind(null, venue?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={venue?.name} required className="input" />
      </Field>
      <Field label="Location">
        <input name="location" defaultValue={venue?.location} required className="input" />
      </Field>
      <Field label="Image URL">
        <input name="image" type="url" defaultValue={venue?.image} required className="input" />
      </Field>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {venue ? "Save changes" : "Create venue"}
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
