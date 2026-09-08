import type { SportPlayer, SportTeam } from "@prisma/client";
import { savePlayer } from "@/lib/actions/cup";

export default function PlayerForm({
  player,
  teams,
}: {
  player?: SportPlayer;
  teams: SportTeam[];
}) {
  const action = savePlayer.bind(null, player?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={player?.name} required className="input" />
      </Field>

      <Field label="Team">
        <select name="teamId" defaultValue={player?.teamId ?? teams[0]?.id} required className="input">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Position">
        <input name="position" defaultValue={player?.position} required className="input" placeholder="Forward" />
      </Field>

      <Field label="Squad number (optional)">
        <input name="number" type="number" min={1} defaultValue={player?.number ?? ""} className="input" />
      </Field>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {player ? "Save changes" : "Add player"}
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
