import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteStory } from "@/lib/actions/admin";

export default async function AdminStoriesPage() {
  const stories = await prisma.story.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Stories</h1>
        <Link
          href="/admin/stories/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New story
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {stories.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {s.category} · {s.status}
                {s.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{s.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/stories/${s.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteStory(s.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {stories.length === 0 && <p className="py-8 font-body text-stone/50">No stories yet.</p>}
      </div>
    </div>
  );
}
