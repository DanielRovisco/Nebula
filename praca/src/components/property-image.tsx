import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Seed images are tiny SVG illustrations served by our own route; real media goes through next/image (AVIF/WebP). */
export function PropertyImage({ src, alt, className, priority, sizes = "(max-width: 768px) 100vw, 400px" }: Props) {
  if (!src) return <div className={cn("flex items-center justify-center bg-surface-2 text-xs text-muted", className)} role="img" aria-label={alt} />;
  if (src.startsWith("/api/img/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"} className={cn("object-cover", className)} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}
