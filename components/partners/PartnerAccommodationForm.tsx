import type { Accommodation } from "@prisma/client";
import { savePartnerAccommodation } from "@/lib/actions/listings";

const types = ["HOTEL", "LODGE", "GUESTHOUSE", "HOMESTAY", "CAMPSITE"];

export default function PartnerAccommodationForm({ accommodation }: { accommodation?: Accommodation }) {
  const action = savePartnerAccommodation.bind(null, accommodation?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={accommodation?.name} required className="input" />
      </Field>

      <Field label="Type">
        <select name="type" defaultValue={accommodation?.type ?? "LODGE"} className="input">
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Region">
        <input name="region" defaultValue={accommodation?.region} required className="input" />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={accommodation?.description}
          required
          rows={4}
          className="input"
        />
      </Field>

      <Field label="Image URL">
        <input name="image" type="url" defaultValue={accommodation?.image} required className="input" />
      </Field>

      <Field label="Price from (KES per night, optional)">
        <input
          name="priceFrom"
          type="number"
          min={0}
          defaultValue={accommodation?.priceFrom ?? ""}
          className="input"
          placeholder="Leave blank for 'contact for rates'"
        />
      </Field>

      <Field label="Amenities (comma-separated)">
        <input
          name="amenities"
          defaultValue={accommodation?.amenities?.join(", ")}
          className="input"
          placeholder="Free WiFi, Pool, Breakfast included"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact phone (optional)">
          <input name="contactPhone" defaultValue={accommodation?.contactPhone ?? ""} className="input" />
        </Field>
        <Field label="Contact email (optional)">
          <input
            name="contactEmail"
            type="email"
            defaultValue={accommodation?.contactEmail ?? ""}
            className="input"
          />
        </Field>
      </div>

      <Field label="External booking URL (optional)">
        <input
          name="externalBookingUrl"
          type="url"
          defaultValue={accommodation?.externalBookingUrl ?? ""}
          className="input"
          placeholder="https://"
        />
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={accommodation?.featured} />
        Featured (Visit Taita team picks featured listings)
      </label>

      {!accommodation && (
        <p className="font-body text-xs text-stone/50">
          New listings are saved as drafts and reviewed by the Visit Taita
          team before they go live on the Stay page.
        </p>
      )}

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {accommodation ? "Save changes" : "Submit listing"}
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
