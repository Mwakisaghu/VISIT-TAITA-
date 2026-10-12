import type { Maker } from "@prisma/client";
import Link from "next/link";
import { saveMaker } from "@/lib/actions/makers";
import ImageField from "@/components/uploads/ImageField";
import GuideFields from "@/components/field/GuideFields";
import { prisma } from "@/lib/prisma";

const hint = "font-body text-sm text-stone/70";

export default async function MakerForm({ maker }: { maker?: Maker }) {
  const action = saveMaker.bind(null, maker?.id ?? null);
  const experiences = await prisma.experience.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name"><input name="name" defaultValue={maker?.name} required minLength={2} maxLength={80} className="input" /></Field>
      <label className="flex items-center gap-2 font-body text-sm text-stone"><input type="checkbox" name="isGroup" defaultChecked={maker?.isGroup} /> This is a group (for example a women&apos;s weaving circle), not one person</label>
      <Field label="What they make"><input name="craft" defaultValue={maker?.craft} required minLength={2} maxLength={80} placeholder="e.g. Sisal basket weaving" className="input" /></Field>
      <Field label="Where they work (village or town)"><input name="village" defaultValue={maker?.village} required minLength={2} maxLength={80} className="input" /></Field>
      <Field label="Their story"><textarea name="story" defaultValue={maker?.story} required minLength={20} maxLength={2000} rows={7} className="input" /><span className={hint}>Leave a blank line between paragraphs. Write what they told you, in plain words.</span></Field>
      <Field label="A line in their own words (optional)"><input name="quote" defaultValue={maker?.quote ?? ""} maxLength={240} className="input" /></Field>
      <ImageField name="image" label="Photo (optional: only with their agreement)" purpose="photo" defaultValue={maker?.image ?? undefined} />
      <GuideFields kind="place" defaults={maker} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Workshop latitude (optional)"><input name="latitude" type="number" step="any" min={-4.7} max={5.1} defaultValue={maker?.latitude ?? ""} className="input" /></Field>
        <Field label="Workshop longitude (optional)"><input name="longitude" type="number" step="any" min={33.9} max={41.95} defaultValue={maker?.longitude ?? ""} className="input" /></Field>
      </div>
      <p className={hint}>Copy both numbers from Google Maps (latitude first). Fill in both or neither.</p>
      <Field label="Visit the workshop (optional)">
        <select name="experienceId" defaultValue={maker?.experienceId ?? ""} className="input">
          <option value="">No workshop visit</option>
          {experiences.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <span className={hint}>An experience that lets visitors meet this maker.</span>
      </Field>

      <fieldset className="rounded-sm border-2 border-stone/30 p-5">
        <legend className="px-2 font-body text-sm font-semibold text-stone">Consent</legend>
        <label className="flex items-start gap-3 font-body text-sm text-stone">
          <input type="checkbox" name="consent" defaultChecked={!!maker?.consentGivenAt} className="mt-1" />
          <span>{`${maker?.isGroup ? "Every member of this group has" : "This person has"} agreed to be named and shown on Visit Taita.`}</span>
        </label>
        <p className={`mt-3 ${hint}`}>Nothing about a maker appears publicly until this is ticked, even if the status is Published. {maker?.consentGivenAt ? `Consent recorded on ${maker.consentGivenAt.toISOString().slice(0, 10)}.` : "No consent recorded yet, so this maker is hidden."}</p>
      </fieldset>

      <Field label="Status">
        <select name="status" defaultValue={maker?.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
      </Field>
      <label className="flex items-center gap-2 font-body text-sm text-stone"><input type="checkbox" name="featured" defaultChecked={maker?.featured} /> Maker of the month (shown first in the shop)</label>

      <div className="flex gap-3">
        <button type="submit" className="focus-ring rounded-full bg-rust px-6 py-2 font-body text-sm text-parchment hover:bg-rust-deep">Save</button>
        <Link href="/admin/makers" className="focus-ring rounded-full border border-stone/30 px-6 py-2 font-body text-sm text-stone">Cancel</Link>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="font-body text-sm text-stone/70">{label}</span>{children}</label>;
}
