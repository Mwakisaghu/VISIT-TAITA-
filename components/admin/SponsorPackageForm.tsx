import type { SponsorPackage } from "@prisma/client";
import { savePackage } from "@/lib/actions/sponsors";

export default function SponsorPackageForm({ sponsorPackage }: { sponsorPackage?: SponsorPackage }) {
  const action = savePackage.bind(null, sponsorPackage?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Package name">
        <input name="name" defaultValue={sponsorPackage?.name} required className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Indicative starting price (KES)">
          <input
            name="startingPrice"
            type="number"
            min={1}
            defaultValue={sponsorPackage?.startingPrice}
            required
            className="input"
          />
        </Field>
        <Field label="Price note (optional)">
          <input
            name="priceNote"
            defaultValue={sponsorPackage?.priceNote ?? ""}
            className="input"
            placeholder="per year"
          />
        </Field>
      </div>

      <Field label="Core rights (comma or new-line separated)">
        <textarea
          name="rights"
          defaultValue={sponsorPackage?.rights?.join("\n")}
          rows={4}
          className="input"
          placeholder={"Naming\nVenue\nContent\nHospitality"}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sort order (lowest first)">
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={sponsorPackage?.sortOrder ?? 0}
            className="input"
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={sponsorPackage?.status ?? "DRAFT"} className="input">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </Field>
      </div>

      <p className="font-body text-xs text-stone/50">
        Prices are indicative starting points, shown publicly as &quot;from&quot; figures — packages are
        tailored in conversation.
      </p>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {sponsorPackage ? "Save changes" : "Create package"}
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
