import Image from "next/image";
import { canOptimize } from "@/lib/image-src";

/** A picture that fills its (positioned) parent. Renders nothing when there is no source, so the parent's tone shows instead. */
export default function Photo({ src, alt, sizes, priority = false, className = "" }: { src: string | null | undefined; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (!src) return null;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!canOptimize(src)} className={`object-cover ${className}`} />;
}
