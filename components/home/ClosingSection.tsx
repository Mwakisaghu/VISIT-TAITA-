import Link from "next/link";
import Landscape from "@/components/home/Landscape";
import Parallax from "@/components/home/Parallax";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, primaryCta } from "@/components/home/ui";

export default function ClosingSection({ image }: { image: string }) {
  return (
    <section aria-labelledby="calling-title" className="grain relative isolate flex min-h-[85svh] items-center justify-center overflow-hidden bg-stone px-6 py-32 text-center text-parchment">
      <Parallax speed={0.14} className="absolute -inset-y-[12%] inset-x-0 -z-10">
        <Landscape className="absolute inset-0 h-full w-full" />
        <Photo src={image} alt="" sizes="100vw" />
      </Parallax>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-stone/70 via-stone/25 to-stone/80" />
      <Reveal>
        <p className={`${eyebrow} text-ochre`}>Your next story starts here</p>
        <h2 id="calling-title" className={`${display} mt-6 text-[clamp(3rem,9vw,8rem)] uppercase leading-[0.92] [text-shadow:0_2px_40px_rgba(0,0,0,0.4)]`}>Taita is<br />calling.</h2>
        <p className="mx-auto mt-6 max-w-sm font-body text-lg text-parchment/85">Your next story starts here.</p>
        <div className="mt-10"><Link href="/discover" className={primaryCta}>Explore Taita <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></div>
      </Reveal>
    </section>
  );
}
