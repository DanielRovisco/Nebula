import { Fragment, type ReactNode } from "react";

/**
 * Small, safe Markdown subset for articles: ## / ### headings, paragraphs, "- " lists, **bold**, *italic* and links.
 * It builds React nodes (never HTML strings) and only lets http(s) and relative links through.
 */
const safeHref = (h: string) => /^(https?:\/\/|\/|#|mailto:)/i.test(h);

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={i++}>{renderInline(m[1])}</strong>);
    else if (m[2] != null) out.push(<em key={i++}>{renderInline(m[2])}</em>);
    else if (m[3] != null && m[4] != null) {
      out.push(
        safeHref(m[4]) ? (
          <a key={i++} href={m[4]} className="text-brand underline" {...(/^https?:/i.test(m[4]) ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
            {m[3]}
          </a>
        ) : (
          m[3]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const nodes: ReactNode[] = [];
  blocks.forEach((raw, bi) => {
    const lines = raw.split("\n");
    // A block may start with a heading line followed by body lines.
    let rest = lines;
    const head = /^(#{2,3})\s+(.+)$/.exec(lines[0] ?? "");
    if (head) {
      const Tag = head[1]!.length === 2 ? "h2" : "h3";
      nodes.push(
        <Tag key={`h${bi}`} className={Tag === "h2" ? "mt-8 text-xl font-semibold" : "mt-6 text-lg font-semibold"}>
          {renderInline(head[2]!)}
        </Tag>,
      );
      rest = lines.slice(1);
    }
    const body = rest.join("\n").trim();
    if (!body) return;
    if (rest.every((l) => /^\s*[-*]\s+/.test(l))) {
      nodes.push(
        <ul key={`l${bi}`} className="list-disc space-y-1 pl-6">
          {rest.map((l, i) => (
            <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>
          ))}
        </ul>,
      );
    } else {
      nodes.push(
        <p key={`p${bi}`}>
          {rest.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {renderInline(l)}
            </Fragment>
          ))}
        </p>,
      );
    }
  });
  return <>{nodes}</>;
}
