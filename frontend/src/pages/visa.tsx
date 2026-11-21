import { useMemo, useState } from "react";
import { Icon, Button, Kicker } from "../ui";
import { PageHero, CTA } from "../layout";
import { purposes, visas, visaBySlug, documentSets, CORE_LABEL, Visa, Requirement, fees, rand } from "../lib/content";
import { CostBreakdown } from "./fees";
import { href, navigate } from "../lib/router";

/** The signature element: pick a life purpose, see the matching visa routes with official timing and fees. */
export function PathwayFinder({ compact = false }: { compact?: boolean }) {
  const [purpose, setPurpose] = useState("work");
  const matches = useMemo(() => visas.filter(v => v.purposes.includes(purpose)), [purpose]);
  const current = purposes.find(p => p.id === purpose)!;
  const shown = compact ? matches.slice(0, 3) : matches;
  return <div className={`finder ${compact ? "finder-compact" : ""}`}>
    <div className="finder-head">
      <h2 id="finder-title">What brings you to South Africa?</h2>
      <div className="finder-chips" role="radiogroup" aria-labelledby="finder-title">
        {purposes.map(p => <button key={p.id} role="radio" aria-checked={p.id === purpose} className={p.id === purpose ? "is-on" : ""} onClick={() => setPurpose(p.id)}>{p.label}</button>)}
      </div>
    </div>
    <div className="finder-body" aria-live="polite">
      <p className="finder-question">{current.question}. These routes may apply:</p>
      <ul key={purpose} className="finder-list">
        {shown.map(v => <li key={v.slug}>
          <a href={href(`/visa/${v.slug}`)}>
            <span className="finder-name"><strong>{v.title}</strong><small>{v.section}</small></span>
            <span className="finder-meta"><small>Official target</small>{v.turnaround}</span>
            <span className="finder-meta hide-sm"><small>DHA fee</small>{v.dhaFee}</span>
            <Icon name="chevron" size={18}/>
          </a>
        </li>)}
      </ul>
      <div className="finder-foot">
        {compact && matches.length > 3 ? <a className="link" href={href("/services#finder")}>See all {matches.length} routes<Icon name="arrow" size={15}/></a> : <span className="finder-note">Targets from DHA Immigration Circular No. 08 of 2026, in-country submissions.</span>}
        <a className="link" href={href(`/book?purpose=${purpose}`)}>Not sure? Ask an advisor<Icon name="arrow" size={15}/></a>
      </div>
    </div>
  </div>;
}

export function VisaDirectory() {
  const groups = ["Temporary residence", "Permanent residence", "Waivers"];
  return <div className="directory" id="directory">
    {groups.map(g => <div key={g} className="directory-group">
      <h3>{g}</h3>
      <table>
        <thead><tr><th scope="col">Visa or permit</th><th scope="col">Section</th><th scope="col">Official target</th><th scope="col">DHA fee</th></tr></thead>
        <tbody>{visas.filter(v => v.group === g).map(v => <tr key={v.slug} onClick={() => navigate(`/visa/${v.slug}`)}>
          <th scope="row"><a href={href(`/visa/${v.slug}`)}>{v.title}</a></th><td>{v.section}</td><td>{v.turnaround}</td><td>{v.dhaFee}</td>
        </tr>)}</tbody>
      </table>
    </div>)}
  </div>;
}

function ChecklistItems({ items }: { items: Requirement[] }) {
  return <ul className="req-list">{items.map(d => <li key={d.key}>
    <Icon name={d.conditional ? "check" : "tick"} size={16}/>
    <span><strong>{d.name}{d.conditional && <span className="req-tag">Where applicable</span>}</strong>{d.note && <small>{d.note}</small>}</span>
  </li>)}</ul>;
}

export function VisaPage({ slug }: { slug?: string }) {
  const visa: Visa = visaBySlug(slug) || visas[0];
  const related = visas.filter(v => v.slug !== visa.slug && v.purposes.some(p => visa.purposes.includes(p))).slice(0, 4);
  const steps = ["Initial eligibility consultation", "Visa route and evidence strategy", "Document preparation and quality review", "VFS submission and biometrics", "Application follow-up and outcome guidance"];
  return <>
    <PageHero kicker={`${visa.group}, ${visa.section}`} title={visa.title} text={visa.intro}>
      <div className="visa-switch">
        <label htmlFor="visa-type">Switch visa type</label>
        <div className="select-wrap"><select id="visa-type" value={visa.slug} onChange={e => navigate(`/visa/${e.target.value}`)}>
          {["Temporary residence", "Permanent residence", "Waivers"].map(g => <optgroup key={g} label={g}>{visas.filter(v => v.group === g).map(v => <option key={v.slug} value={v.slug}>{v.title}</option>)}</optgroup>)}
        </select><Icon name="down" size={16}/></div>
      </div>
    </PageHero>

    <div className="facts-band">
      <div className="wrap facts">
        <div><Icon name="clock"/><span><small>Official target</small><strong>{visa.turnaround}</strong></span></div>
        <div><Icon name="file"/><span><small>Indicative DHA fee</small><strong>{visa.dhaFee}</strong></span></div>
        <div><Icon name="receipt"/><span><small>VFS service fee</small><strong>{visa.vfsFee}</strong></span></div>
        <div><Icon name="briefcase"/><span><small>GlobalPath fee</small><strong>{rand(fees.application)}</strong></span></div>
        <div className="facts-cta"><Button to={`/book?visa=${visa.slug}`}>Book a consultation</Button></div>
      </div>
    </div>

    <section className="section wrap article-layout">
      <article className="prose">
        <h2>Who may qualify</h2>
        <p className="lead">{visa.qualifies}</p>
        <p>GlobalPath helps applicants confirm the right category, understand the evidence required and prepare a coherent, well-supported application.</p>
        <aside className="note">
          <strong>About the published timeframe</strong>
          <p>This is the Department of Home Affairs target in Immigration Circular No. 08 of 2026 for applications duly submitted inside South Africa between 1 April 2026 and 31 March 2027. Days are South African working days, excluding weekends and public holidays. It is a service target, not a guaranteed decision date.</p>
        </aside>

        <h2 id="documents">Document checklist</h2>
        <p>Based on the Department of Home Affairs supporting-document list for this category. Our clients upload every required document in the secure portal before we submit.</p>
        <div className="checklist">
          <h3>{CORE_LABEL[visa.core]}</h3>
          <ChecklistItems items={documentSets[visa.core]}/>
          <h3>Additional documents for the {visa.title.toLowerCase()}</h3>
          <ChecklistItems items={visa.requirements}/>
          <p className="checklist-key"><span className="req-tag">Where applicable</span> Only needed if it applies to you, for example if you are married or applying with a child.</p>
        </div>
        <p className="small-print">Home Affairs or VFS may ask for certified copies, sworn translations of documents not in English, or extra records depending on your nationality and where you apply. We confirm the final list for your case at assessment.</p>

        <h2 id="process">How we handle your application</h2>
        <ol className="steps">{steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>

        <h2 id="faq">Questions about this visa</h2>
        <details><summary>What does the {visa.title.toLowerCase()} cost in total?</summary><p>Our professional fee is a fixed {rand(fees.application)} per application. On top of that you pay the DHA fee ({visa.dhaFee}) and the VFS service fee of {rand(fees.vfs)} when the application is submitted. Optional VFS services are extra.</p></details>
        <details><summary>What happens if the application is rejected?</summary><p>You can usually appeal within a prescribed time limit. We prepare and lodge appeals for a fixed fee of {rand(fees.appeal)}. <a className="inline" href={href("/fees#appeals")}>How appeals work</a>.</p></details>
        <details><summary>Are the turnaround times guaranteed?</summary><p>No. They are official departmental performance targets for qualifying in-country submissions during the stated reporting cycle. Completeness, verification, operational conditions and individual circumstances may affect actual processing.</p></details>
        <details><summary>When are fees confirmed?</summary><p>Government and VFS tariffs can change. We confirm the applicable category, exemptions, current tariff and optional service charges immediately before submission.</p></details>
      </article>

      <aside className="sidebar">
        <div className="side-card">
          <Kicker>Start with an assessment</Kicker>
          <h3>Speak to an advisor about the {visa.title.toLowerCase()}</h3>
          <p>A 45-minute consultation, in person in Cape Town or by video, with a written summary of your next steps.</p>
          <Button to={`/book?visa=${visa.slug}`}>Book a consultation</Button>
          <a className="link" href={href("/portal")}>Already a client? Open your portal<Icon name="arrow" size={15}/></a>
        </div>
        <div className="side-cost">
          <h3>Estimated cost</h3>
          <CostBreakdown slug={visa.slug} compact/>
          <a className="link" href={href("/fees")}>All fees explained<Icon name="arrow" size={15}/></a>
        </div>
        {related.length > 0 && <div className="side-related">
          <h3>Related routes</h3>
          {related.map(v => <a key={v.slug} href={href(`/visa/${v.slug}`)}><span>{v.title}</span><small>{v.turnaround}</small></a>)}
        </div>}
      </aside>
    </section>
    <CTA/>
  </>;
}
