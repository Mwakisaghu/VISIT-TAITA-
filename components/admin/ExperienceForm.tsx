import type { Experience } from "@prisma/client";
import { saveExperience } from "@/lib/actions/listings";

const categories = ["WILDLIFE", "CULTURE", "ADVENTURE", "FOOD", "WELLNESS"];

export default function ExperienceForm({ experience }: { experience?: Experience }) {
  const action = saveExperience.bind(null, experience?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={experience?.name} required className="input" />
      </Field>

      <Field label="Category">
        <select name="category" defaultValue={experience?.category ?? "ADVENTURE"} className="input">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Region">
        <input name="region" defaultValue={experience?.region} required className="input" />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={experience?.description}
          required
          rows={4}
          className="input"
        />
      </Field>

      <Field label="Image URL">
        <input name="image" type="url" defaultValue={experience?.image} required className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price from (KES per person, optional)">
          <input
            name="priceFrom"
            type="number"
            min={0}
            defaultValue={experience?.priceFrom ?? ""}
            className="input"
          />
        </Field>
        <Field label="Duration (optional)">
          <input
            name="duration"
            defaultValue={experience?.duration ?? ""}
            className="input"
            placeholder="3 hours, Half day, Full day…"
          />
        </Field>
      </div>

      <Field label="Max group size (optional)">
        <input
          name="groupSizeMax"
          type="number"
          min={1}
          defaultValue={experience?.groupSizeMax ?? ""}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact phone (optional)">
          <input name="contactPhone" defaultValue={experience?.contactPhone ?? ""} className="input" />
        </Field>
        <Field label="Contact email (optional)">
          <input
            name="contactEmail"
            type="email"
            defaultValue={experience?.contactEmail ?? ""}
            className="input"
          />
        </Field>
      </div>

      <Field label="External booking URL (optional)">
        <input
          name="externalBookingUrl"
          type="url"
          defaultValue={experience?.externalBookingUrl ?? ""}
          className="input"
          placeholder="https://"
        />
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={experience?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={experience?.featured} />
        Featured
      </label>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {experience ? "Save changes" : "Create experience"}
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
