import type { FestivalSession, FestivalVenue } from "@prisma/client";
import { saveFestivalSession } from "@/lib/actions/festival";

const categories = ["MUSIC", "FOOD", "CULTURE", "SPORT", "FAMILY", "MARKET", "TALKS"];
const ticketStatuses = ["FREE", "TICKETED", "SOLD_OUT"];

function toLocalInputValue(date?: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function FestivalSessionForm({
  session,
  venues,
}: {
  session?: FestivalSession;
  venues: FestivalVenue[];
}) {
  const action = saveFestivalSession.bind(null, session?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Title">
        <input name="title" defaultValue={session?.title} required className="input" />
      </Field>

      <Field label="Category">
        <select name="category" defaultValue={session?.category ?? "CULTURE"} className="input">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={session?.description}
          required
          rows={3}
          className="input"
        />
      </Field>

      <Field label="Venue">
        <select name="venueId" defaultValue={session?.venueId ?? venues[0]?.id} required className="input">
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Starts">
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(session?.startsAt)}
            required
            className="input"
          />
        </Field>
        <Field label="Ends (optional)">
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(session?.endsAt)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Ticket status">
        <select name="ticketStatus" defaultValue={session?.ticketStatus ?? "FREE"} className="input">
          {ticketStatuses.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (KES, if ticketed)">
          <input name="price" type="number" min={1} defaultValue={session?.price ?? ""} className="input" />
        </Field>
        <Field label="Ticket URL (optional)">
          <input name="ticketUrl" type="url" defaultValue={session?.ticketUrl ?? ""} className="input" />
        </Field>
      </div>

      <Field label="Status">
        <select name="status" defaultValue={session?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={session?.featured} />
        Featured
      </label>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {session ? "Save changes" : "Create session"}
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
