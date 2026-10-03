import type { Sponsor } from "@prisma/client";
import { saveSponsor } from "@/lib/actions/sponsors";
import { SPONSOR_PROGRAMS } from "@/lib/sponsors";

export default function SponsorForm({
  sponsor,
  packages,
}: {
  sponsor?: Sponsor;
  packages: { id: string; name: string }[];
}) {
  const action = saveSponsor.bind(null, sponsor?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Sponsor name">
        <input name="name" defaultValue={sponsor?.name} required className="input" />
      </Field>

      <Field label="Logo URL">
        <input name="logo" type="url" defaultValue={sponsor?.logo} required className="input" />
      </Field>

      <Field label="Website (optional)">
        <input
          name="website"
          type="url"
          defaultValue={sponsor?.website ?? ""}
          className="input"
          placeholder="https://"
        />
      </Field>

      <Field label="Package (optional)">
        <select name="packageId" defaultValue={sponsor?.packageId ?? ""} className="input">
          <option value="">— None —</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-body text-sm text-stone/70">Show on these event pages</legend>
        {SPONSOR_PROGRAMS.map((p) => (
          <label key={p.key} className="flex items-center gap-2 font-body text-sm text-stone/70">
            <input
              type="checkbox"
              name="programs"
              value={p.key}
              defaultChecked={sponsor?.programs?.includes(p.key)}
            />
            {p.label}
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="showOnHome" defaultChecked={sponsor?.showOnHome} />
        Show on the homepage
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Display order (lowest first)">
          <input
            name="displayOrder"
            type="number"
            min={0}
            defaultValue={sponsor?.displayOrder ?? 0}
            className="input"
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={sponsor?.status ?? "DRAFT"} className="input">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </Field>
      </div>

      <p className="font-body text-xs text-stone/50">
        Only add real, confirmed partners — sponsors appear publicly once published.
      </p>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {sponsor ? "Save changes" : "Add sponsor"}
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
