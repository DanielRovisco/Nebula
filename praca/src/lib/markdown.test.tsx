import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const html = (s: string) => renderToStaticMarkup(<Markdown source={s} />);

describe("Markdown", () => {
  it("renders headings, bold and lists", () => {
    const h = html("Intro **forte**\n\n## Título\nTexto\n\n- um\n- dois");
    expect(h).toContain("<strong>forte</strong>");
    expect(h).toContain("<h2");
    expect(h).toContain("<li>dois</li>");
  });
  it("never emits raw HTML from the source", () => expect(html("<script>alert(1)</script>")).not.toContain("<script>"));
  it("blocks javascript: links but keeps https links safe", () => {
    expect(html("[x](javascript:alert(1))")).not.toContain("href");
    expect(html("[x](https://exemplo.pt)")).toContain('rel="noopener noreferrer"');
  });
});
