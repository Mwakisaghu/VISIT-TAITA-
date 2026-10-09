import type { Story } from "@prisma/client";
import { saveStory } from "@/lib/actions/admin";
import ImageField from "@/components/uploads/ImageField";

const categories = ["PEOPLE", "PLACES", "CULTURE", "SPORT", "ADVENTURE"];

export default function StoryForm({ story, destinations = [] }: { story?: Story; destinations?: { id: string; name: string; region: string }[] }) {
  const action = saveStory.bind(null, story?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Title">
        <input name="title" defaultValue={story?.title} required className="input" />
      </Field>

      <Field label="Category">
        <select name="category" defaultValue={story?.category ?? "PEOPLE"} className="input">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Excerpt">
        <textarea name="excerpt" defaultValue={story?.excerpt} required rows={3} className="input" />
      </Field>

      <Field label="Place this story is about (optional)">
        <select name="destinationId" defaultValue={story?.destinationId ?? ""} className="input">
          <option value="">No particular place</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {d.region}</option>
          ))}
        </select>
        <span className="font-body text-sm text-stone/70">Shown as &ldquo;Where this happened&rdquo;, with where it sits between the plains and the hills, and used to suggest a stay and an experience nearby.</span>
      </Field>

      <Field label="Body">
        <textarea name="body" defaultValue={story?.body} rows={8} className="input" />
        <span className="font-body text-sm text-stone/70">Leave a blank line between paragraphs. Start a paragraph with &gt; to make it a pull quote.</span>
      </Field>

      <Field label="Reading time">
        <input
          name="readingTime"
          defaultValue={story?.readingTime ?? "5 min read"}
          required
          className="input"
        />
      </Field>

      <ImageField name="image" label="Image" purpose="photo" defaultValue={story?.image} required />

      <Field label="Status">
        <select name="status" defaultValue={story?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={story?.featured} />
        Featured
      </label>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {story ? "Save changes" : "Create story"}
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
