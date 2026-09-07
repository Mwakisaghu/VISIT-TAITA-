import type { Destination } from "@prisma/client";
import { saveDestination } from "@/lib/actions/admin";

const categories = ["WILD", "CULTURE", "ADVENTURE", "FOOD", "SPORT", "PEOPLE"];

export default function DestinationForm({ destination }: { destination?: Destination }) {
  const action = saveDestination.bind(null, destination?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={destination?.name} required className="input" />
      </Field>

      <Field label="Category">
        <select name="category" defaultValue={destination?.category ?? "WILD"} className="input">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Region">
        <input name="region" defaultValue={destination?.region} required className="input" />
      </Field>

      <Field label="Description">
        <textarea
          name="blurb"
          defaultValue={destination?.blurb}
          required
          rows={4}
          className="input"
        />
      </Field>

      <Field label="Image URL">
        <input
          name="image"
          type="url"
          defaultValue={destination?.image}
          required
          className="input"
        />
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={destination?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={destination?.featured} />
        Featured
      </label>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {destination ? "Save changes" : "Create destination"}
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
