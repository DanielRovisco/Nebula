import type { ReactNode } from "react";

export function ProsePage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 max-w-2xl text-lg text-muted">{intro}</p>}
      <div className="mt-10 space-y-8 text-[17px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:max-w-[68ch]">{children}</div>
    </article>
  );
}
