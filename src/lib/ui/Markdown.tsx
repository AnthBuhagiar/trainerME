import { Fragment, type ReactNode } from "react";

/**
 * Just enough Markdown for the legal pages: headings, paragraphs, bullet and
 * numbered lists, tables, **bold** and *italic*. No HTML is ever passed through.
 */

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={m.index}>{m[1]}</strong> : <em key={m.index}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\\([[\]])/g, "$1").trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0];
        if (first.startsWith("# ")) return <h1 key={i} className="display text-[24px] leading-tight">{inline(first.slice(2))}</h1>;
        if (first.startsWith("## ")) return <h2 key={i} className="display mt-2 text-[18px]">{inline(first.slice(3))}</h2>;
        if (lines.every((l) => /^- /.test(l)))
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i} className="flex list-decimal flex-col gap-1.5 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>)}
            </ol>
          );
        if (lines.length >= 2 && first.startsWith("|") && /^\|[\s:|-]+\|$/.test(lines[1].trim())) {
          const head = cells(first);
          return (
            <div key={i} className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr>{head.map((h, j) => <th key={j} className="border-b border-line px-3 py-2 font-semibold">{inline(h)}</th>)}</tr>
                </thead>
                <tbody>
                  {lines.slice(2).map((r, j) => (
                    <tr key={j} className="align-top">{cells(r).map((c, k) => <td key={k} className="border-b border-line px-3 py-2 last:border-b-0">{inline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && " "}{inline(l)}</Fragment>)}</p>;
      })}
    </>
  );
}
