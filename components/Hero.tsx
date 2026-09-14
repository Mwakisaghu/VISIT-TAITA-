import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative flex h-[92vh] min-h-[560px] items-end overflow-hidden bg-stone">
      <Image
        src="https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2000"
        alt="Sunrise over the Taita Hills, seen from a ridge trail"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone via-stone/20 to-transparent" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        <h1 className="font-display text-5xl leading-[0.95] text-parchment sm:text-7xl">
          More than
          <br />a place.
        </h1>
        <p className="mt-6 max-w-md font-body text-lg text-parchment/85">
          Discover the wild, the culture, the people and the sport that make
          Taita different.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="/discover"
            className="focus-ring rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep"
          >
            Explore Taita
          </Link>
          <Link
            href="/#passport"
            className="focus-ring rounded-full border border-parchment/40 px-7 py-3 font-body text-sm text-parchment transition-colors hover:border-ochre hover:text-ochre"
          >
            Start your passport
          </Link>
        </div>
      </div>
    </section>
  );
}
