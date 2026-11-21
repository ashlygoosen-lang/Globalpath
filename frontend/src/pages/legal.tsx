import type { MouseEvent } from "react";
import { PageHero } from "../layout";
import { href } from "../lib/router";
import { LEGAL_DOCS, legalDoc, type Block } from "../legal";

const LINK_WORDS: [RegExp, string][] = [
  [/(Refund and cancellation policy)/, "/legal/refunds"],
  [/(Privacy policy)/, "/legal/privacy"],
  [/(Client identification and anti-money-laundering policy)/, "/legal/fica"],
  [/(Terms of service)/, "/legal/terms"],
];

/** Turns the first mention of another policy in a paragraph into a link. */
function Text({ value, self }: { value: string; self: string }) {
  for (const [re, to] of LINK_WORDS) {
    if (to.endsWith(self)) continue;
    const m = value.match(re);
    if (m && m.index !== undefined) {
      return <>{value.slice(0, m.index)}<a className="inline" href={href(to)}>{m[1]}</a><Text value={value.slice(m.index + m[1].length)} self={self}/></>;
    }
  }
  return <>{value}</>;
}

function BlockView({ block, self }: { block: Block; self: string }) {
  if (typeof block === "string") return <p><Text value={block} self={self}/></p>;
  if ("list" in block) return <ul className="legal-list">{block.list.map((li, i) => <li key={i}><Text value={li} self={self}/></li>)}</ul>;
  if ("note" in block) return <p className="legal-note"><Text value={block.note} self={self}/></p>;
  const { head, rows } = block.table;
  const blankHead = head.every(h => !h);
  return <div className="legal-table-wrap"><table className="legal-table">
    {!blankHead && <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>}
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}><Text value={c} self={self}/></td>)}</tr>)}</tbody>
  </table></div>;
}

export function Legal({ slug }: { slug?: string }) {
  const doc = legalDoc(slug) || legalDoc("privacy")!;
  const jump = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#/legal/${doc.slug}#${id}`);
  };
  return <>
    <PageHero kicker="Legal" title={doc.title} text={doc.summary}/>
    <section className="section wrap legal-layout">
      <aside className="legal-aside" aria-label="Legal documents">
        <nav className="legal-docs">
          {LEGAL_DOCS.map(d => <a key={d.slug} href={href(`/legal/${d.slug}`)} aria-current={d.slug === doc.slug ? "page" : undefined}>{d.nav}</a>)}
        </nav>
        {doc.sections.length > 4 && <nav className="legal-toc" aria-label="On this page">
          <strong>On this page</strong>
          <ol>{doc.sections.map(s => <li key={s.id}><a href={`#/legal/${doc.slug}#${s.id}`} onClick={jump(s.id)}>{s.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
        </nav>}
      </aside>
      <article className="legal-doc">
        <p className="legal-meta">Last updated {doc.updated}. GlobalPath Immigration is a division of VINK Group (Pty) Ltd, registration number 2018/079316/07.</p>
        {doc.sections.map(s => <section key={s.id} id={s.id} className={`legal-section ${s.important ? "is-important" : ""}`}>
          <h2>{s.title}{s.important && <span className="legal-flag">Please read carefully</span>}</h2>
          {s.blocks.map((b, i) => <BlockView key={i} block={b} self={doc.slug}/>)}
        </section>)}
        <p className="legal-contact">Questions about this document? Email <a className="inline" href="mailto:hello@globalpath.co.za">hello@globalpath.co.za</a> or call <a className="inline" href="tel:+27815433728">081 543 3728</a>.</p>
      </article>
    </section>
  </>;
}
