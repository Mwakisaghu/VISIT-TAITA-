import type { SportTeam } from "@prisma/client";
import { saveTeam } from "@/lib/actions/cup";

export default function TeamForm({ team }: { team?: SportTeam }) {
  const action = saveTeam.bind(null, team?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={team?.name} required className="input" />
      </Field>
      <Field label="Town">
        <input name="town" defaultValue={team?.town} required className="input" />
      </Field>
      <Field label="Crest (emoji)">
        <input name="crest" defaultValue={team?.crest} required maxLength={4} className="input" />
      </Field>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {team ? "Save changes" : "Create team"}
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
