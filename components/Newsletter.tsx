"use client";

export default function Newsletter() {
  return (
    <section id="newsletter" className="bg-canopy px-6 py-20 text-parchment">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl sm:text-4xl">Taita is calling.</h2>
        <p className="mt-3 font-body text-parchment/80">
          Stories, events and new experiences from Taita, in your inbox once a
          month. No noise.
        </p>

        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@email.com"
            className="focus-ring w-full rounded-full border border-parchment/30 bg-transparent px-5 py-3 font-body text-sm text-parchment placeholder:text-parchment/50 sm:w-72"
          />
          <button
            type="submit"
            className="focus-ring rounded-full bg-ochre px-6 py-3 font-body text-sm text-stone transition-colors hover:bg-parchment"
          >
            Join the letter
          </button>
        </form>
      </div>
    </section>
  );
}
